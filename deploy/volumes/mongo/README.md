# MongoDB Volumes

## Replica Keyfile

PowerSync requires MongoDB to run as a replica set (for change streams). Replica sets
need a shared keyfile for internal authentication between members.

**Generate the keyfile (first deployment only):**

```bash
openssl rand -base64 756 > replica-keyfile
chmod 444 replica-keyfile
```

The `docker-compose.yml` entrypoint script copies this file to `/tmp/` with correct
ownership (`mongodb:mongodb`, `400` permissions) at container startup.

> **Note:** The keyfile is gitignored because it's a deployment-specific secret.
> Each environment (staging, production) must generate its own keyfile.
