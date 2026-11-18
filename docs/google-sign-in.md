# Google sign-in release

Google sign-in uses the same session as email sign-in. The first successful Google sign-in creates a FindMySensi account with a generated public handle after the player confirms they are 18 or older. Subsequent sign-ins use Google's stable account identifier. Existing email accounts keep their current login method. Google sign-in does not automatically link an existing email account.

## Google Auth Platform settings

Use the FindMySensi project in the designated Google Cloud owner account. In Google Auth Platform, use the following settings for the web application.

| Setting                       | Value                                              |
| ----------------------------- | -------------------------------------------------- |
| App name                      | FindMySensi                                        |
| Audience                      | External                                           |
| Support and developer contact | The FindMySensi project owner and support contact  |
| Homepage                      | `https://findmysensi.com/`                         |
| Privacy policy                | `https://findmysensi.com/privacy`                  |
| Terms of service              | `https://findmysensi.com/terms`                    |
| Authorized domain             | `findmysensi.com`                                  |
| Client type                   | Web application                                    |
| Authorized redirect URI       | `https://findmysensi.com/api/auth/callback/google` |
| Scopes                        | `openid`, `email`, `profile`                       |

Use the exact redirect URI, including its path. The callback is served by the public frontend. The frontend passes the callback to the private API and returns the session cookies to the browser. The flow uses a server-side client, so it does not need a JavaScript origin for a Google client SDK.

Keep the OAuth client secret in the **private** Vercel project's Production environment. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_OAUTH_ORIGIN=https://findmysensi.com`. The configured origin must also be in the backend's trusted origins. The frontend uses its existing `API_URL` and canonical site URL. Google enables only when all three backend values are present. The public app does not need the Google client secret.

Test in Google Auth Platform with the intended test account before publishing the audience. Verify a new account, a return sign-in, a canceled consent screen, and an existing email account. Confirm the new user's public handle and age record and check that Google's profile name, picture and tokens are absent from stored account data. Publish the external audience after those checks and follow any domain or branding verification Google requests.

Sources: [Google Auth Platform](https://support.google.com/cloud/answer/15544987), [Google app audience](https://support.google.com/cloud/answer/15549945), [Better Auth Google provider](https://better-auth.com/docs/authentication/google).
