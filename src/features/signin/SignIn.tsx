import { useRef } from 'react'
import { useAuth } from '../../auth/context'
import { Button } from '../../ui/Button'
import styles from './SignIn.module.css'

export function SignIn() {
  const { signIn, error, isConfigured } = useAuth()
  const privacyUrl = `${import.meta.env.BASE_URL}privacy.html`
  const aboutRef = useRef<HTMLDialogElement>(null)
  return (
    <main className={styles.landing}>
      <section className={styles.hero}>
        <img
          className={styles.logo}
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt=""
        />
        <h1 className={styles.title}>Displaai</h1>
        <p className={styles.tagline}>
          A free web app to browse, map, tag and edit the photos you already
          keep in Google Drive.
        </p>
        <Button className={styles.signInButton} onClick={() => void signIn()}>
          Sign in with Google
        </Button>
        {!isConfigured && (
          <p role="alert">
            Set <code>VITE_GOOGLE_CLIENT_ID</code> in <code>.env.local</code>.
          </p>
        )}
        {error && <p role="alert">{error}</p>}
      </section>

      <dialog
        ref={aboutRef}
        className={styles.about}
        aria-labelledby="landing-what"
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close()
        }}
      >
        <h2 id="landing-what">What Displaai does</h2>
        <p>
          Google Drive is a convenient place to store photos but not a good one
          to look through them. Displaai connects to the folders of your Drive
          you choose and turns them into a photo library that runs in your
          browser:
        </p>
        <ul>
          <li>Browse photos and videos by folder in a fast gallery.</li>
          <li>See photos that have GPS data on a map.</li>
          <li>Add tags and build saved views that combine folders and tags.</li>
          <li>Edit photos and save them back to Drive.</li>
          <li>
            Find faces and objects with detection that runs on your own device.
          </li>
        </ul>
        <h2>How your data is used</h2>
        <p>
          Signing in with Google gives the app access to your Google Drive so it
          can list, display, tag and edit your photos. There is no Displaai
          server: everything happens in your browser, and your photos and
          account data are never sent to or stored by the developer or any third
          party. You can sign out and revoke access at any time. Displaai
          follows the Google API Services User Data Policy, including the
          Limited Use requirements. Read the full{' '}
          <a href={privacyUrl}>privacy policy</a>.
        </p>
        <p>
          Read the{' '}
          <a
            href="https://github.com/melisa-abuin/drive-photos-displayer"
            target="_blank"
            rel="noreferrer"
          >
            source code
          </a>{' '}
          on GitHub.
        </p>
        <Button small onClick={() => aboutRef.current?.close()}>
          Close
        </Button>
      </dialog>

      <footer className={styles.footer}>
        <a href={privacyUrl}>Privacy Policy</a>
        <button
          type="button"
          className={styles.footerLink}
          onClick={() => aboutRef.current?.showModal()}
        >
          Information
        </button>
        <p>
          Not affiliated with or endorsed by Google. Google Drive is a trademark
          of Google LLC.
        </p>
      </footer>
    </main>
  )
}
