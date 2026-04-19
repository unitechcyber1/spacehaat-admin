import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { NotFound } from './pages/NotFound'
import { LoginPage } from './pages/auth/LoginPage'
import { RequireAuth } from './components/RequireAuth'
import { CountryPage } from './pages/locations/CountryPage'
import { StatePage } from './pages/locations/StatePage'
import { CityPage } from './pages/locations/CityPage'
import { MicroLocationPage } from './pages/locations/MicroLocationPage'
import { BrandListPage } from './pages/brand/BrandListPage'
import { BrandFormPage } from './pages/brand/BrandFormPage'
import { CoworkingPlansPage } from './pages/coworking/CoworkingPlansPage/CoworkingPlansPage'
import { CoworkingSpaceListPage } from './pages/coworking/CoworkingSpaceListPage/CoworkingSpaceListPage'
import { CoworkingSpaceDetailPage } from './pages/coworking/CoworkingSpaceDetailPage/CoworkingSpaceDetailPage'
import { TopCoworkingCitiesPage } from './pages/coworking/TopCoworkingCitiesPage/TopCoworkingCitiesPage'
import { PriorityCoworkingPage } from './pages/coworking/PriorityCoworkingPage/PriorityCoworkingPage'
import { MediaListPage } from './pages/media/MediaListPage'
import { MediaFormPage } from './pages/media/MediaFormPage'
import { SeoListPage } from './pages/seo/SeoListPage'
import { SeoFormPage } from './pages/seo/SeoFormPage'
import { AmenityListPage } from './pages/amenity/AmenityListPage'
import { AmenityFormPage } from './pages/amenity/AmenityFormPage'
import { OfficeSpaceListPage } from './pages/office-space/OfficeSpaceListPage'
import { OfficeSpaceFormPage } from './pages/office-space/OfficeSpaceFormPage'

function LegacyCoworkingDetailRedirect() {
  const { featuredSpaceId } = useParams<{ featuredSpaceId: string }>()
  return <Navigate to={`/layout/coworking/spaces/detail/${featuredSpaceId}`} replace />
}

/** `/layout/amenity/detail/:id` → `/layout/amenty/detail/:id` (legacy path uses “amenty”). */
function AmenityDetailSpellingRedirect() {
  const { amentyId } = useParams<{ amentyId: string }>()
  return <Navigate to={`/layout/amenty/detail/${amentyId}`} replace />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/layout/space-from-listing" replace />} />

      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/*" element={<PlaceholderPage title="Auth" />} />

      <Route
        path="/layout"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/layout/space-from-listing" replace />} />

        <Route path="dashboard/*" element={<PlaceholderPage title="Dashboard" />} />
        <Route path="priority/workspace" element={<Navigate to="/layout/coworking/priority" replace />} />
        <Route path="priority/*" element={<PlaceholderPage title="Priority" />} />

        <Route path="enquiry" element={<PlaceholderPage title="Enquiry" />} />
        <Route path="enquiry/add" element={<PlaceholderPage title="Enquiry / Add" />} />
        <Route path="enquiry/detail/:leadId" element={<PlaceholderPage title="Enquiry / Detail" />} />

        <Route path="users-from-listing" element={<PlaceholderPage title="Users from listing" />} />
        <Route path="booking" element={<PlaceholderPage title="Booking" />} />

        <Route path="work-space" element={<PlaceholderPage title="Work space" />} />
        <Route path="work-space/detail/:workSpaceId" element={<PlaceholderPage title="Work space / Detail" />} />
        <Route path="work-space/add" element={<PlaceholderPage title="Work space / Add" />} />

        <Route path="inventory" element={<PlaceholderPage title="Inventory" />} />
        <Route path="inventory/detail/:inventoryId" element={<PlaceholderPage title="Inventory / Detail" />} />
        <Route path="inventory/add" element={<PlaceholderPage title="Inventory / Add" />} />

        <Route path="customer/add" element={<PlaceholderPage title="Customer / Add" />} />
        <Route path="customer/detail/:customerId" element={<PlaceholderPage title="Customer / Detail" />} />

        <Route path="space-from-listing" element={<PlaceholderPage title="Space from listing" />} />
        <Route
          path="space-from-listing/detail/:workSpaceId/:spacetype"
          element={<PlaceholderPage title="Space from listing / Detail" />}
        />
        <Route path="space-from-listing/add" element={<PlaceholderPage title="Space from listing / Add" />} />

        <Route path="featured-space" element={<PlaceholderPage title="Featured space" />} />
        <Route path="featured-space/detail/:featuredSpaceId" element={<PlaceholderPage title="Featured space / Detail" />} />
        <Route path="featured-space/add" element={<PlaceholderPage title="Featured space / Add" />} />

        <Route path="coworking/plans" element={<CoworkingPlansPage />} />
        <Route path="coworking/spaces" element={<CoworkingSpaceListPage />} />
        <Route path="coworking/spaces/add" element={<CoworkingSpaceDetailPage />} />
        <Route path="coworking/spaces/detail/:workspaceId" element={<CoworkingSpaceDetailPage />} />
        <Route path="coworking/top-cities" element={<TopCoworkingCitiesPage />} />
        <Route path="coworking/priority" element={<PriorityCoworkingPage />} />

        <Route path="coworking-page" element={<Navigate to="/layout/coworking/spaces" replace />} />
        <Route path="coworking-page/add" element={<Navigate to="/layout/coworking/spaces/add" replace />} />
        <Route path="coworking-page/detail/:featuredSpaceId" element={<LegacyCoworkingDetailRedirect />} />

        <Route path="popular-workspace" element={<Navigate to="/layout/coworking/top-cities" replace />} />

        <Route path="office-space" element={<OfficeSpaceListPage />} />
        <Route path="office-space/detail/:officeSpaceId" element={<OfficeSpaceFormPage />} />
        <Route path="office-space/add" element={<OfficeSpaceFormPage />} />

        <Route path="builder" element={<PlaceholderPage title="Builder" />} />
        <Route path="builder/detail/:builderId" element={<PlaceholderPage title="Builder / Detail" />} />
        <Route path="builder/add" element={<PlaceholderPage title="Builder / Add" />} />

        <Route path="subbuilder" element={<PlaceholderPage title="Subbuilder" />} />
        <Route path="subbuilder/detail/:subbuilderId" element={<PlaceholderPage title="Subbuilder / Detail" />} />
        <Route path="subbuilder/add" element={<PlaceholderPage title="Subbuilder / Add" />} />

        <Route path="amenty" element={<AmenityListPage />} />
        <Route path="amenty/add" element={<AmenityFormPage />} />
        <Route path="amenty/detail/:amentyId" element={<AmenityFormPage />} />
        <Route path="amenity" element={<Navigate to="/layout/amenty" replace />} />
        <Route path="amenity/add" element={<Navigate to="/layout/amenty/add" replace />} />
        <Route path="amenity/detail/:amentyId" element={<AmenityDetailSpellingRedirect />} />

        <Route path="brand" element={<BrandListPage />} />
        <Route path="brand/add" element={<BrandFormPage />} />
        <Route path="brand/detail/:brandId" element={<BrandFormPage />} />

        <Route path="brand-ads" element={<PlaceholderPage title="Brand Ads" />} />
        <Route path="brand-ads/detail/:brandAdsId" element={<PlaceholderPage title="Brand Ads / Detail" />} />
        <Route path="brand-ads/add" element={<PlaceholderPage title="Brand Ads / Add" />} />

        <Route path="media" element={<MediaListPage />} />
        <Route path="media/detail/:brandAdsId" element={<MediaFormPage />} />
        <Route path="media/add" element={<MediaFormPage />} />

        <Route path="blog" element={<PlaceholderPage title="Blog" />} />
        <Route path="blog/detail/:blogId" element={<PlaceholderPage title="Blog / Detail" />} />
        <Route path="blog/add" element={<PlaceholderPage title="Blog / Add" />} />

        <Route path="country" element={<CountryPage />} />
        <Route path="state" element={<StatePage />} />
        <Route path="city" element={<CityPage />} />
        <Route path="micro-location" element={<MicroLocationPage />} />
        <Route path="categories" element={<PlaceholderPage title="Categories" />} />
        <Route path="coliving-plans" element={<PlaceholderPage title="Coliving plans" />} />
        <Route path="flat-plans" element={<PlaceholderPage title="Flat plans" />} />
        <Route path="room" element={<PlaceholderPage title="Room" />} />

        <Route path="seo" element={<SeoListPage />} />
        <Route path="seo/detail/:seoId" element={<SeoFormPage />} />
        <Route path="seo/add" element={<SeoFormPage />} />

        <Route path="equipment" element={<PlaceholderPage title="Equipment" />} />
        <Route path="contact-us" element={<PlaceholderPage title="Contact us" />} />

        <Route path="popular-flatspace" element={<PlaceholderPage title="Popular flatspace" />} />
        <Route path="popular-officespace" element={<PlaceholderPage title="Popular officespace" />} />

        <Route path="student-housing-space" element={<PlaceholderPage title="Student housing space" />} />
        <Route
          path="student-housing-space/detail/:studentHousingLivingSpaceId"
          element={<PlaceholderPage title="Student housing space / Detail" />}
        />
        <Route path="student-housing-space/add" element={<PlaceholderPage title="Student housing space / Add" />} />

        <Route path="flat" element={<PlaceholderPage title="Flat" />} />
        <Route path="flat/detail/:coLivingSpaceId" element={<PlaceholderPage title="Flat / Detail" />} />
        <Route path="flat/add" element={<PlaceholderPage title="Flat / Add" />} />

        <Route path="co-living-space" element={<PlaceholderPage title="Co-living space" />} />
        <Route path="co-living-space/detail/:coLivingSpaceId" element={<PlaceholderPage title="Co-living space / Detail" />} />
        <Route path="co-living-space/add" element={<PlaceholderPage title="Co-living space / Add" />} />

        <Route path="review" element={<PlaceholderPage title="Review" />} />

        <Route path="cofynd-users" element={<PlaceholderPage title="Cofynd users" />} />
        <Route path="cofynd-users/add" element={<PlaceholderPage title="Cofynd users / Add" />} />
        <Route path="cofynd-users/access/:userId" element={<PlaceholderPage title="Cofynd users / Access" />} />
        <Route path="cofynd-users/:userId" element={<PlaceholderPage title="Cofynd users / Edit" />} />

        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
