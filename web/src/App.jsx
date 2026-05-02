/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { lazy, Suspense, useContext, useMemo } from 'react';
import { Route, Routes, useLocation, useParams } from 'react-router-dom';
import Loading from './components/common/ui/Loading';
import { AuthRedirect, PrivateRoute, AdminRoute, HomeRedirect } from './helpers';
import { StatusContext } from './context/Status';
import SetupCheck from './components/layout/SetupCheck';

// ── Eager: needed for DynamicOAuth2Callback wrapper ──
import OAuth2Callback from './components/auth/OAuth2Callback';

// ── Lazy: page / feature components ──
const User = lazy(() => import('./pages/User'));
const RegisterForm = lazy(() => import('./components/auth/RegisterForm'));
const LoginForm = lazy(() => import('./components/auth/LoginForm'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Forbidden = lazy(() => import('./pages/Forbidden'));
const Setting = lazy(() => import('./pages/Setting'));
const PasswordResetForm = lazy(() => import('./components/auth/PasswordResetForm'));
const PasswordResetConfirm = lazy(() => import('./components/auth/PasswordResetConfirm'));
const Channel = lazy(() => import('./pages/Channel'));
const UserChannel = lazy(() => import('./pages/UserChannel'));
const UserChannelReview = lazy(() => import('./pages/UserChannelReview'));
const Token = lazy(() => import('./pages/Token'));
const Redemption = lazy(() => import('./pages/Redemption'));
const TopUp = lazy(() => import('./pages/TopUp'));
const TopUpAdmin = lazy(() => import('./pages/TopUpAdmin'));
const AdminAffiliate = lazy(() => import('./pages/AdminAffiliate'));
const AdminModelMarket = lazy(() => import('./pages/AdminModelMarket'));
const Log = lazy(() => import('./pages/Log'));
const Chat = lazy(() => import('./pages/Chat'));
const Chat2Link = lazy(() => import('./pages/Chat2Link'));
const Midjourney = lazy(() => import('./pages/Midjourney'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Task = lazy(() => import('./pages/Task'));
const ModelPage = lazy(() => import('./pages/Model'));
const ModelDeploymentPage = lazy(() => import('./pages/ModelDeployment'));
const Playground = lazy(() => import('./pages/Playground'));
const Subscription = lazy(() => import('./pages/Subscription'));
const Wallet = lazy(() => import('./pages/Wallet'));
const Treasury = lazy(() => import('./pages/Treasury'));
const PersonalSetting = lazy(() => import('./components/settings/PersonalSetting'));
const Setup = lazy(() => import('./pages/Setup'));
const Home = lazy(() => import('./pages/Home/index_v2'));
const Store = lazy(() => import('./pages/Store'));
const ModelMarket = lazy(() => import('./pages/ModelMarket'));
const AffiliateLanding = lazy(() => import('./pages/Affiliate/Landing'));
const AffiliateInvite = lazy(() => import('./pages/Affiliate/Invite'));
const AffiliateDashboard = lazy(() => import('./pages/Affiliate/Dashboard'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const About = lazy(() => import('./pages/About/LandingAbout'));
const UserAgreement = lazy(() => import('./pages/UserAgreement'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const LandingPrivacy = lazy(() => import('./pages/PrivacyPolicy/LandingPrivacy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const Docs = lazy(() => import('./pages/Docs'));
const DesktopAuth = lazy(() => import('./pages/DesktopAuth'));

function DynamicOAuth2Callback() {
  const { provider } = useParams();
  return <OAuth2Callback type={provider} />;
}

function App() {
  const location = useLocation();
  const [statusState] = useContext(StatusContext);

  const pricingRequireAuth = useMemo(() => {
    const headerNavModulesConfig = statusState?.status?.HeaderNavModules;
    if (headerNavModulesConfig) {
      try {
        const modules = JSON.parse(headerNavModulesConfig);
        if (typeof modules.pricing === 'boolean') {
          return false;
        }
        return modules.pricing?.requireAuth === true;
      } catch (error) {
        console.error('解析顶栏模块配置失败:', error);
        return false;
      }
    }
    return false;
  }, [statusState?.status?.HeaderNavModules]);

  return (
    <SetupCheck>
      <Routes>
        <Route
          path='/'
          element={
            <HomeRedirect>
              <Suspense fallback={<Loading />} key={location.pathname}>
                <Store />
              </Suspense>
            </HomeRedirect>
          }
        />
        <Route
          path='/setup'
          element={
            <Suspense fallback={<Loading />} key={location.pathname}>
              <Setup />
            </Suspense>
          }
        />
        <Route
          path='/forbidden'
          element={
            <Suspense fallback={<Loading />}>
              <Forbidden />
            </Suspense>
          }
        />
        <Route
          path='/console/models'
          element={
            <AdminRoute>
              <Suspense fallback={<Loading />}>
                <ModelPage />
              </Suspense>
            </AdminRoute>
          }
        />
        <Route
          path='/console/deployment'
          element={
            <AdminRoute>
              <Suspense fallback={<Loading />}>
                <ModelDeploymentPage />
              </Suspense>
            </AdminRoute>
          }
        />
        <Route
          path='/console/subscription'
          element={
            <AdminRoute>
              <Suspense fallback={<Loading />}>
                <Subscription />
              </Suspense>
            </AdminRoute>
          }
        />
        <Route
          path='/console/channel'
          element={
            <AdminRoute>
              <Suspense fallback={<Loading />}>
                <Channel />
              </Suspense>
            </AdminRoute>
          }
        />
        <Route
          path='/console/user-channel'
          element={
            <PrivateRoute>
              <Suspense fallback={<Loading />}>
                <UserChannel />
              </Suspense>
            </PrivateRoute>
          }
        />
        <Route
          path='/console/user-channel-review'
          element={
            <AdminRoute>
              <Suspense fallback={<Loading />}>
                <UserChannelReview />
              </Suspense>
            </AdminRoute>
          }
        />
        <Route
          path='/console/token'
          element={
            <PrivateRoute>
              <Suspense fallback={<Loading />}>
                <Token />
              </Suspense>
            </PrivateRoute>
          }
        />
        <Route
          path='/console/playground'
          element={
            <PrivateRoute>
              <Suspense fallback={<Loading />}>
                <Playground />
              </Suspense>
            </PrivateRoute>
          }
        />
        <Route
          path='/console/redemption'
          element={
            <AdminRoute>
              <Suspense fallback={<Loading />}>
                <Redemption />
              </Suspense>
            </AdminRoute>
          }
        />
        <Route
          path='/console/topup-admin'
          element={
            <AdminRoute>
              <Suspense fallback={<Loading />}>
                <TopUpAdmin />
              </Suspense>
            </AdminRoute>
          }
        />
        <Route
          path='/console/affiliate-admin'
          element={
            <AdminRoute>
              <Suspense fallback={<Loading />} key={location.pathname}>
                <AdminAffiliate />
              </Suspense>
            </AdminRoute>
          }
        />
        <Route
          path='/console/model-market-admin'
          element={
            <AdminRoute>
              <Suspense fallback={<Loading />} key={location.pathname}>
                <AdminModelMarket />
              </Suspense>
            </AdminRoute>
          }
        />
        <Route
          path='/console/user'
          element={
            <AdminRoute>
              <Suspense fallback={<Loading />}>
                <User />
              </Suspense>
            </AdminRoute>
          }
        />
        <Route
          path='/user/reset'
          element={
            <Suspense fallback={<Loading />} key={location.pathname}>
              <PasswordResetConfirm />
            </Suspense>
          }
        />
        <Route
          path='/login'
          element={
            <Suspense fallback={<Loading />} key={location.pathname}>
              <AuthRedirect>
                <LoginForm />
              </AuthRedirect>
            </Suspense>
          }
        />
        <Route
          path='/register'
          element={
            <Suspense fallback={<Loading />} key={location.pathname}>
              <AuthRedirect>
                <RegisterForm />
              </AuthRedirect>
            </Suspense>
          }
        />
        <Route
          path='/reset'
          element={
            <Suspense fallback={<Loading />} key={location.pathname}>
              <PasswordResetForm />
            </Suspense>
          }
        />
        <Route
          path='/desktop-auth'
          element={
            <Suspense fallback={<Loading />} key={location.pathname}>
              <DesktopAuth />
            </Suspense>
          }
        />
        <Route
          path='/oauth/:provider'
          element={
            <Suspense fallback={<Loading />} key={location.pathname}>
              <DynamicOAuth2Callback />
            </Suspense>
          }
        />
        <Route
          path='/console/setting'
          element={
            <AdminRoute>
              <Suspense fallback={<Loading />} key={location.pathname}>
                <Setting />
              </Suspense>
            </AdminRoute>
          }
        />
        <Route
          path='/console/personal'
          element={
            <PrivateRoute>
              <Suspense fallback={<Loading />} key={location.pathname}>
                <PersonalSetting />
              </Suspense>
            </PrivateRoute>
          }
        />
        <Route
          path='/console/topup'
          element={
            <PrivateRoute>
              <Suspense fallback={<Loading />} key={location.pathname}>
                <TopUp />
              </Suspense>
            </PrivateRoute>
          }
        />
        <Route
          path='/console/wallet'
          element={
            <PrivateRoute>
              <Suspense fallback={<Loading />} key={location.pathname}>
                <Wallet />
              </Suspense>
            </PrivateRoute>
          }
        />
        <Route
          path='/console/treasury'
          element={
            <AdminRoute>
              <Suspense fallback={<Loading />} key={location.pathname}>
                <Treasury />
              </Suspense>
            </AdminRoute>
          }
        />
        <Route
          path='/console/log'
          element={
            <PrivateRoute>
              <Suspense fallback={<Loading />}>
                <Log />
              </Suspense>
            </PrivateRoute>
          }
        />
        <Route
          path='/console'
          element={
            <PrivateRoute>
              <Suspense fallback={<Loading />} key={location.pathname}>
                <Dashboard />
              </Suspense>
            </PrivateRoute>
          }
        />
        <Route
          path='/console/midjourney'
          element={
            <PrivateRoute>
              <Suspense fallback={<Loading />} key={location.pathname}>
                <Midjourney />
              </Suspense>
            </PrivateRoute>
          }
        />
        <Route
          path='/console/task'
          element={
            <PrivateRoute>
              <Suspense fallback={<Loading />} key={location.pathname}>
                <Task />
              </Suspense>
            </PrivateRoute>
          }
        />
        <Route
          path='/pricing'
          element={
            pricingRequireAuth ? (
              <PrivateRoute>
                <Suspense fallback={<Loading />} key={location.pathname}>
                  <Pricing />
                </Suspense>
              </PrivateRoute>
            ) : (
              <Suspense fallback={<Loading />} key={location.pathname}>
                <Pricing />
              </Suspense>
            )
          }
        />
        <Route
          path='/about'
          element={
            <Suspense fallback={<Loading />} key={location.pathname}>
              <About />
            </Suspense>
          }
        />
        <Route
          path='/user-agreement'
          element={
            <Suspense fallback={<Loading />} key={location.pathname}>
              <UserAgreement />
            </Suspense>
          }
        />
        <Route
          path='/privacy-policy'
          element={
            <Suspense fallback={<Loading />} key={location.pathname}>
              <PrivacyPolicy />
            </Suspense>
          }
        />
        <Route
          path='/privacy'
          element={
            <Suspense fallback={<Loading />} key={location.pathname}>
              <LandingPrivacy />
            </Suspense>
          }
        />
        <Route
          path='/tos'
          element={
            <Suspense fallback={<Loading />} key={location.pathname}>
              <TermsOfService />
            </Suspense>
          }
        />
        <Route
          path='/docs'
          element={
            <Suspense fallback={<Loading />} key={location.pathname}>
              <Docs />
            </Suspense>
          }
        />
        <Route
          path='/console/chat/:id?'
          element={
            <Suspense fallback={<Loading />} key={location.pathname}>
              <Chat />
            </Suspense>
          }
        />
        <Route
          path='/chat2link'
          element={
            <PrivateRoute>
              <Suspense fallback={<Loading />} key={location.pathname}>
                <Chat2Link />
              </Suspense>
            </PrivateRoute>
          }
        />
        <Route
          path='/compute-pool'
          element={
            <Suspense fallback={<Loading />} key={location.pathname}>
              <Home />
            </Suspense>
          }
        />
        <Route
          path='/store'
          element={
            <Suspense fallback={<Loading />} key={location.pathname}>
              <Store />
            </Suspense>
          }
        />
        <Route
          path='/model-market'
          element={
            <Suspense fallback={<Loading />} key={location.pathname}>
              <ModelMarket />
            </Suspense>
          }
        />
        <Route
          path='/affiliate'
          element={
            <Suspense fallback={<Loading />} key={location.pathname}>
              <AffiliateLanding />
            </Suspense>
          }
        />
        <Route
          path='/invite'
          element={
            <Suspense fallback={<Loading />} key={location.pathname}>
              <AffiliateInvite />
            </Suspense>
          }
        />
        <Route
          path='/console/affiliate'
          element={
            <PrivateRoute>
              <Suspense fallback={<Loading />} key={location.pathname}>
                <AffiliateDashboard />
              </Suspense>
            </PrivateRoute>
          }
        />
        <Route
          path='*'
          element={
            <Suspense fallback={<Loading />}>
              <NotFound />
            </Suspense>
          }
        />
      </Routes>
    </SetupCheck>
  );
}

export default App;
