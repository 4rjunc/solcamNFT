import { useState } from "react";
import { StyleSheet, View, Image } from "react-native";
import { Button } from "react-native-paper";
import {
  CameraType,
  launchCameraAsync,
  launchImageLibraryAsync,
  MediaTypeOptions,
  requestCameraPermissionsAsync,
  requestMediaLibraryPermissionsAsync,
} from "expo-image-picker";
import { alertAndLog } from "../utils/alertAndLog";
import { createAssetAsync } from "expo-media-library";
import { useNFTUtils } from "../utils/useNFTUtils";

export type NFTAsset = {
  fileName: string;
  extension: string;
  uri: string;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  buttonRow: {
    display: "flex",
    flexDirection: "row",
    gap: 8,
  },
  image: {
    width: 300,
    height: 300,
  },
});

export default function NFTScreen() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [nftAsset, setNftAsset] = useState<NFTAsset | null>(null);

  const { createNFT } = useNFTUtils();

  const requestPermissions = async () => {
    const { status: mediaLibraryPermissionStatus } =
      await requestMediaLibraryPermissionsAsync();

    if (mediaLibraryPermissionStatus !== "granted") {
      alertAndLog(
        "Camera Roll Access Denied",
        "We Need Camera Roll Permissions",
      );

      return false;
    }

    const { status: cameraPermissionStatus } =
      await requestCameraPermissionsAsync();

    if (cameraPermissionStatus !== "granted") {
      alertAndLog("Camera Access Denied", "We Need Camera Permissions");
      return false;
    }
    return true;
  };

  const pickImageFromGallery = async () => {
    setIsLoading(true);
    const permissionsGranted = await requestPermissions();
    if (!permissionsGranted) {
      setIsLoading(false);
      return;
    }
    const result = await launchImageLibraryAsync({
      mediaTypes: MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
      selectionLimit: 1,
    });
    if (!result.canceled) {
      const fileNameParts = result.assets[0].fileName?.split(".")!;
      setNftAsset({
        fileName: fileNameParts[0],
        extension: fileNameParts[1],
        uri: result.assets[0].uri,
      });
    }
    setIsLoading(false);
  };

  const captureImage = async () => {
    setIsLoading(true);
    const permissionsGranted = await requestPermissions();
    if (!permissionsGranted) {
      setIsLoading(false);
      return;
    }
    const result = await launchCameraAsync({
      cameraType: CameraType.back,
      mediaTypes: MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) {
      const asset = await createAssetAsync(result.assets[0].uri);
      const extension = asset.filename.split(".")[1];
      setNftAsset({
        fileName: asset.id,
        extension: extension,
        uri: asset.uri,
      });
      alertAndLog("Image saved", "The Image Saved In Gallery");
    }

    setIsLoading(false);
  };

  const handleCreateNFT = async () => {
    setIsLoading(true);
    if (nftAsset) {
      await createNFT(nftAsset);
    }
    setIsLoading(false);
  };

  const clearImage = () => {
    setNftAsset(null);
  };

  return (
    <View style={styles.container}>
      {nftAsset ? (
        <>
          <Image source={{ uri: nftAsset.uri }} style={styles.image} />

          <Button
            mode="contained"
            loading={isLoading}
            onPress={handleCreateNFT}
            disabled={isLoading}
          >
            Create NFT
          </Button>

          <Button mode="outlined" onPress={clearImage} disabled={isLoading}>
            Clear image
          </Button>
        </>
      ) : (
        <>
          <Button mode="contained" onPress={captureImage} disabled={isLoading}>
            Take a photo
          </Button>

          <Button
            mode="contained"
            onPress={pickImageFromGallery}
            disabled={isLoading}
          >
            Select a photo from the gallery
          </Button>
        </>
      )}
    </View>
  );
}
