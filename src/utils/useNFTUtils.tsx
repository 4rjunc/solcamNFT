// react modules
import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

// metaplex modules
import { createNft } from "@metaplex-foundation/mpl-token-metadata";
import { generateSigner, percentAmount } from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";

// utils
import { useAuthorization } from "./useAuthorization";
import { alertAndLog } from "./alertAndLog";
import { getLocation } from "./functions";
import { supabase } from "./supabase";
import { useUmi } from "./UmiProvider";
import { useConnection } from "./ConnectionProvider";

//import { NftAsset } from "../screens";

// FileSystem
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system";

export function useNFTUtils() {
  const { selectedAccount } = useAuthorization();
  const { connection } = useConnection();
  const queryClient = useQueryClient();
  const umi = useUmi();

  const createNFT = async (asset: NftAsset) => {
    if (!selectedAccount?.publicKey) {
      return;
    }

    const location = await getLocation();

    if (!location) {
      alertAndLog("Location Error", "Location Coordinates Not Found");
      return;
    }

    const base64ImageFile = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    alertAndLog("Uploading!!", "Uploading Files To Supabase");

    const { data: imageResponse, error: imageError } = await supabase.storage
      .from("solanamob")
      .upload(
        `nfts/image/${asset.filename}.${asset.extension}`,
        decode(base64ImageFile),
        {
          upsert: true,
        },
      );

    if (imageError) {
      alertAndLog("Minting Failed", "Error While Uploading Image");
      return;
    }

    const { data: storedFile } = supabase.storage
      .from("solanamob")
      .getPublicUrl(imageResponse.path);

    const metadata = {
      name: `Photo #${asset.fileName}`,
      description: "NFT minted using solcamNFT",
      image: storedFile.publicUrl,
      external_url: "https://github.com/4rjunc",
      attributes: [
        {
          trait_type: "Latitude",
          value: location.latitude,
        },
        {
          trait_type: "Longitude",
          value: location.longitude,
        },
      ],
      properties: {
        files: [
          {
            uri: storedFile.publicUrl,
            type: "image/jpeg",
          },
        ],
        category: "image",
      },
      creators: [
        {
          address: selectedAccount.publicKey.toBase58(),
          share: 100,
        },
      ],
    };

    alertAndLog("Uploading!!", "Uploading Metadata To Supabase");

    const { data: metadataResponse, error: metadataError } =
      await supabase.storage
        .from("solanamob")
        .upload(
          `nfts/metadata/${asset.fileName}.json`,
          JSON.stringify(metadata),
          {
            contentType: "application/json",
            upsert: true,
          },
        );

    if (metadataError) {
      alertAndLog("Minting failed", "Error While Uploading Metadata");
      return;
    }

    const { data: metadataUri } = supabase.storage
      .from("solanamob")
      .getPublicUrl(metadataResponse.path);

    const mint = generateSigner(umi);
    alertAndLog("Minting NFT", "Creating Transaction");

    let tx;
    try {
      tx = await createNft(umi, {
        mint: mint,
        sellerFeeBasisPoints: percentAmount(5.5),
        name: metadata.name,
        uri: metadataUri.publicUrl,
      }).sendAndConfirm(umi, {
        send: { skipPreflight: true, commitment: "confirmed", maxRetries: 3 },
      });
    } catch (error) {
      console.log(error);
      return;
    }

    const signature = base58.deserialize(tx.signature)[0];

    console.log(
      "transaction: ",
      `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    );

    queryClient.invalidateQueries({
      queryKey: [
        "get-token-accounts",
        {
          endpoint: connection.rpcEndpoint,
          address: selectedAccount.publicKey,
        },
      ],
    });

    alertAndLog("MINT IS SUCCESS!", "Your NFT has been created successfully!");
  };
  return useMemo(() => ({ createNFT }), [createNFT]);
}
