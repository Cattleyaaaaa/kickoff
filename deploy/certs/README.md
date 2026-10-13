# Production TLS certificates

Place the certificate chain at `fullchain.pem` and its matching private key at `privkey.pem` in this directory on the server. The directory is intentionally excluded from Git and Docker build contexts. Never commit or copy private keys into the repository.

The production Nginx config currently serves `kickoff.nextfield.top`; change both `server_name` entries in `../nginx.conf` if the deployment uses a different hostname. The DNS A/AAAA records must point to the server before obtaining a certificate. Install and configure certificate renewal on the host, then reload/restart the frontend container after renewal.
