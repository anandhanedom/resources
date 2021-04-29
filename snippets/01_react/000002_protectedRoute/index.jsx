import { useDispatch, useSelector } from "react-redux";
import { updateAccessor } from "./redux/accessor/accessor.actions";

import {
  Switch,
  Route,
  Redirect,
  useLocation,
  useHistory,
} from "react-router-dom";

import pages from "./components/pages";

// Firebase Auth
import firebase from "firebase/app";
import "firebase/auth";

// Pages
const LoginPage = lazy(() => import("./pages/LoginPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const ErrorPage = lazy(() => import("./pages/ErrorPage"));
const ShipmentPage = lazy(() => import("./pages/ShipmentPage"));
const ShipmentsListPage = lazy(() => import("./pages/ShipmentsListPage"));
const TrackingPage = lazy(() => import("./pages/TrackingPage"));

// Prompt
const ConfirmPrompt = lazy(() => import("./components/ConfirmPrompt"));

// Check if user groups has access to roles defined
const userHasAccess = (path, userGroups) =>
  pages
    .find((page) => page.path === path.split("/")[1])
    .groups.some((group) =>
      userGroups.some((userGroup) => userGroup === group)
    );

const ProtectedRoute = ({ path, component, ...props }) => {
  const location = useLocation();
  const accessor = useSelector((state) => state.accessor.accessor);
  const userGroups = accessor && accessor.groups;

  // Wait for groups
  if (!userGroups) return <>Waiting to sign you in</>;
  // Authenticated user -> go to route, while waiting for group
  else if (
    accessor &&
    !accessor.deactivatedAt &&
    (path === "/" || userHasAccess(path, userGroups))
  )
    return (
      <>
        <Header />
        <SideNav>
          <Route exact path={path} component={component} {...props} />
        </SideNav>
      </>
    );
  else if (accessor && accessor.deactivatedAt) return <ErrorPage />;
  // Unauthenticated user -> go to login path, but redirect to requested page once logged in
  else if (accessor) {
    // dispatch(showErrorAlert("You don't have access to this page"));
    return <Redirect to="/" />;
  } else {
    return (
      <Redirect
        to={`/login?redirect=${path.slice(1, 100)}${Object.entries(location)
          .map(([key, value]) => `&${key}=${value}`)
          .join("")}`}
      />
    );
  }
};

function App() {
  const dispatch = useDispatch();
  const history = useHistory();
  const location = useLocation();

  const listenToAuthStateChanges = () => {
    firebase.auth().onAuthStateChanged(async (fbUser) => {
      console.log(location.search);
      let { redirect, ...propObject } = location.search;
      if (fbUser) {
        // API call to backend to get user details from token getAccessor()
        // const accessor = await getAccessor();
        // Update redux state

        const user = {
          id: 1,
          email: "Jayaram Kasi",
          groups: ["Developer admin"],
        };
        dispatch(updateAccessor({ ...user, imgUrl: fbUser.photoURL }));
        if (window.location.pathname === "/login")
          history.push(
            `/${redirect || ""}${
              Object.entries(propObject).length > 0
                ? `?${Object.entries(propObject)
                    .map(([key, value]) => `${key}=${value}`)
                    .join("&")}`
                : ``
            }`
          );
      } else if (window.location.pathname !== "/login")
        // if in any other page redirect the user to the login page
        history.push("/login");
    });
  };
  useEffect(() => {
    listenToAuthStateChanges();
  }, []);
  return (
    <div>
      <Switch>
        <Route exact path="/login" component={LoginPage} />
        <ProtectedRoute
          exact
          path="/shipment/:waybillNumber"
          component={ShipmentPage}
        />
        <Route
          exact
          path="/shipment/:waybillNumber/track"
          component={TrackingPage}
        />
        <ProtectedRoute exact path="/shipments" component={ShipmentsListPage} />
        <ProtectedRoute exact path="/" component={HomePage} />
        <Route path="*" component={ErrorPage} />
      </Switch>

      <ConfirmPrompt />
    </div>
  );
}

export default App;
