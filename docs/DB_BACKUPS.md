# Database backups to S3

Weekly `pg_dump` backups of Postgres to a private S3 bucket, scheduled by
system cron on the app server. The kit in `scripts/backup/` is app-agnostic:
copy the folder into any app and set a few config values.

## How it works

Each run dumps the database (`pg_dump -Fc`, compressed), checks the dump is
readable with `pg_restore --list`, then uploads it twice:

| Key | Retention |
| --- | --- |
| `weekly/<app>_<UTC timestamp>.dump` | Deleted by the bucket lifecycle after 84 days (about 12 backups) |
| `latest/<app>.dump` | Never expires; always the most recent good backup |

`latest/` is written only after the dated upload succeeds, so a failed run never
replaces a good backup. If backups stop for any reason, the dated copies age out
but `latest/` keeps the last good dump.

Pruning is done by the bucket lifecycle, not the script, so the server's AWS
key only needs upload permission. A compromised server cannot delete backups.

## Files

| File | Runs on | Purpose |
| --- | --- | --- |
| `scripts/backup/create-bucket.sh` | Admin laptop, once per app | Creates the bucket (or re-applies settings) and optionally an upload-only IAM user |
| `scripts/backup/db-backup-to-s3.sh` | App server, by cron | Takes and uploads one backup |
| `scripts/backup/install-cron.sh` | App server, once | Runs a test backup, then installs the weekly cron line |

## Configuration

Read from the environment first, then from the app's env file (`.env.local`,
else `.env`, in the app root; override with `BACKUP_ENV_FILE`). The file is
parsed, never executed. Never commit real values.

| Variable | Required | Purpose |
| --- | --- | --- |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Yes | Key allowed to upload to the bucket |
| `AWS_REGION` | Yes | Bucket region |
| `BACKUP_S3_BUCKET` | Yes (or `AWS_S3_BUCKET_NAME`) | Bucket name |
| `BACKUP_APP_NAME` | No (default `db`) | Prefix in backup file names |
| `BACKUP_DB_CONTAINER` | One DB source | Docker container running Postgres; dumps via `docker exec` |
| `BACKUP_DB_NAME` / `BACKUP_DB_USER` | With container | Database and role inside the container |
| `BACKUP_DATABASE_URL` | One DB source | Any reachable Postgres (falls back to `DATABASE_URL`). Prisma-only URL options are stripped. Needs host `pg_dump`/`pg_restore` at or above the server's major version |
| `BACKUP_NOTIFY_URL` | No | URL requested after each successful backup, e.g. a [healthchecks.io](https://healthchecks.io) check, so a missed backup raises an alert |

If `BACKUP_DB_CONTAINER` is set it wins; otherwise the URL is used.

## RSM VoC values

| Setting | Value |
| --- | --- |
| Bucket | `rsm-voc-db-backups` (`us-east-1`) |
| `BACKUP_APP_NAME` | `rsm_voc` |
| `BACKUP_DB_CONTAINER` | `rsm-voc-db` |
| `BACKUP_DB_NAME` / `BACKUP_DB_USER` | `rsm_voc` / `rsm_voc` |
| Schedule | Sunday 02:00 (server time) |
| Server user / app dir | `rsmuser` / `~/rsm-voc-survey-eng` |
| Server env file | `~/rsm-voc-survey-eng/.env` (no `.env.local` on the VPS) |

## Setup for an app

### 1. Create the bucket (admin laptop, once)

Needs the AWS CLI and an admin-capable key. Bucket names are global across AWS.

```bash
./scripts/backup/create-bucket.sh <app>-db-backups --region us-east-1 --env-file .env.local
```

Add `--uploader-user` to also create IAM user `<bucket>-uploader` that can only
upload to `weekly/` and `latest/`; its key is printed once. Prefer that key on
the server over an admin key. `BACKUP_RETENTION_DAYS` (default `84`) changes
how long `weekly/` copies are kept. Re-running the script is safe.

### 2. Prepare the server (once)

As the app user (not root). Install the AWS CLI v2 if `aws --version` fails:

```bash
sudo apt-get install -y unzip
curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-$(uname -m).zip" -o /tmp/awscliv2.zip
unzip -q /tmp/awscliv2.zip -d /tmp && sudo /tmp/aws/install && rm -rf /tmp/aws /tmp/awscliv2.zip
aws --version
```

For container mode, the app user must be able to run `docker` without sudo
(`docker ps` works). For URL mode, install a matching `postgresql-client`.

### 3. Add the config to the server's env file

Append the variables from the configuration table to the app's env file (for
RSM VoC: `~/rsm-voc-survey-eng/.env`, mode 600; the script uses `.env.local`
only when it exists), using the values for
that app. Keep the file out of git.

### 4. Pull and install the cron

```bash
cd ~/rsm-voc-survey-eng && git pull
./scripts/backup/install-cron.sh
```

It runs one real backup and installs the cron line only if that succeeds.
Re-running replaces the line instead of duplicating it. Options:
`--schedule "0 2 * * *"`, `--skip-test`, `--remove`.

### 5. Verify

```bash
crontab -l | grep db-backup-to-s3
tail -n 20 ~/logs/db-backup-rsm-voc-survey-eng.log
```

From a machine with read access to the bucket:

```bash
aws s3 ls s3://rsm-voc-db-backups/weekly/
aws s3 ls s3://rsm-voc-db-backups/latest/
```

## Restore

An upload-only key cannot download. Fetch the dump with an admin key (for
example on a laptop, then `scp` it to the server).

```bash
aws s3 cp s3://rsm-voc-db-backups/latest/rsm_voc.dump ./rsm_voc.dump
# or a dated copy from weekly/; overwritten/deleted copies stay recoverable
# briefly via S3 versioning (aws s3api list-object-versions)
```

### Restore test (do this after setup, then periodically)

Restores into a throwaway container and compares row counts with live. It does
not touch the live database.

```bash
docker run -d --name restore-test --memory 384m \
  -e POSTGRES_PASSWORD=restore-test pgvector/pgvector:pg16
until docker exec restore-test pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
docker exec restore-test createdb -U postgres restore_check
docker exec -i restore-test pg_restore -U postgres -d restore_check \
  --no-owner --no-privileges < rsm_voc.dump
docker exec restore-test psql -U postgres -d restore_check -c 'SELECT count(*) FROM "Response";'
docker exec rsm-voc-db psql -U rsm_voc -d rsm_voc -c 'SELECT count(*) FROM "Response";'
docker rm -f restore-test && rm rsm_voc.dump
```

The counts should match, allowing for responses received since the backup.

### Real restore (disaster recovery)

This overwrites live data. Take a fresh dump of the current state first if the
database is still reachable.

```bash
pm2 stop ecosystem.config.js
docker exec -i rsm-voc-db pg_restore -U rsm_voc -d rsm_voc \
  --clean --if-exists --no-owner < rsm_voc.dump
pm2 start ecosystem.config.js
```

On a brand-new server, start the `db` service from `docker-compose.yml` first
(it creates the `vector` extension), then run the same `pg_restore`.

## Reusing for another app

1. Copy `scripts/backup/` and this file into the app's repo.
2. Run `create-bucket.sh` for a new bucket named for that app.
3. Set that app's values in its server env file (step 3) and run
   `install-cron.sh` on its server.

One bucket and one upload-only key per app keeps each client's backups isolated.

## Notes

- Dumps contain private data (client identity, responses, raw payloads). Keep
  buckets private and decide retention with the data owner.
- Buckets: Block Public Access, SSE-S3 encryption, versioning,
  BucketOwnerEnforced, HTTPS-only policy.
- Cron does not alert on failure by itself. Set `BACKUP_NOTIFY_URL` or check
  the log.
