import { Link } from 'react-router-dom'
import { PageShell } from '../components/PageShell'
import { Button } from '../components/Button'

export function NotFound() {
  return (
    <PageShell title="Page not found" description="This route does not exist in the admin panel.">
      <div className="card pad list-empty max-w-lg">
        <strong>404 — not found</strong>
        <p className="mt-2">Check the URL or return to a section from the sidebar.</p>
        <div className="mt-5">
          <Link to="/layout/enquiry">
            <Button variant="primary">Go to enquiries</Button>
          </Link>
        </div>
      </div>
    </PageShell>
  )
}
