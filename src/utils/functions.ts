import {
  getCurrentPositionAsync,
  requestForegroundPermissionsAsync,
  LocationAccuracy,
  LocationObjectCoords,
} from "expo-location";
import { Alert } from "react-native";
import { alertAndLog } from "./alertAndLog";

// to fetch location and place the coordinates in the meta data of the NFT
export const getLocation = async () => {
  const { status } = await requestForegroundPermissionsAsync();
  if (status !== "granted") {
    alertAndLog(
      "Location access denied",
      "Don't deny we need location access to spy you!",
    );
    return null;
  }

  const location = await getCurrentPositionAsync({
    accuracy: LocationAccuracy.Highest,
  });

  return location.coords;
};
