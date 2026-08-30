# Beacon Support

Official support and privacy website for Beacon, a community app for people
living in Korea.

- Support: https://ycm-you-can-manage.github.io/beacon-support/
- Privacy Policy: https://ycm-you-can-manage.github.io/beacon-support/privacy/
- Delete Account: https://ycm-you-can-manage.github.io/beacon-support/delete-account/

The account deletion page authenticates the user directly with Supabase and
calls the caller-scoped `delete-user` Edge Function. The browser uses only the
public publishable key; privileged service credentials are never included in
the website.

## Local preview

Run a static web server from this directory:

```sh
python3 -m http.server 8080
```

Then open http://localhost:8080.

The site is deployed automatically to GitHub Pages when changes are pushed to
the `main` branch.
