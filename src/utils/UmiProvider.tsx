// READ MORE ABOUT: https://developers.metaplex.com/umi
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

// metaplex imports
import type { Umi } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  WalletAdapter,
  walletAdapterIdentity,
} from "@metaplex-foundation/umi-signer-wallet-adapters";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";

// user wallet and cluster connection
import { useAuthorization } from "./useAuthorization";
import { useMobileWallet } from "./useMobileWallet";
import { useCluster } from "../components/cluster/cluster-data-access";

type UmiContext = {
  umi: Umi | null;
};

const DEFAULT_CONTEXT: UmiContext = {
  umi: null,
};

export const UmiContext = createContext<UmiContext>(DEFAULT_CONTEXT);

export const UmiProvider = ({ children }: { children: ReactNode }) => {
  const { selectedAccount } = useAuthorization();
  const { selectedCluster } = useCluster();
  const { signMessage, signTransactionForUMI, signAllTransactionsForUMI } =
    useMobileWallet();
  const [walletAdapter, setWalletAdapter] = useState<WalletAdapter | null>(
    null,
  );
  const [umi, setUmi] = useState<Umi | null>(null);

  useEffect(() => {
    if (selectedAccount) {
      setWalletAdapter({
        publicKey: selectedAccount.publicKey,
        signMessage: signMessage,
        signTransaction: signTransactionForUMI,
        signAllTransactions: signAllTransactionsForUMI,
      });
    } else {
      setWalletAdapter(null);
    }
  }, [selectedAccount]);

  useEffect(() => {
    let umi: Umi | null = null;

    if (selectedCluster && walletAdapter) {
      umi = createUmi(selectedCluster.endpoint)
        .use(walletAdapterIdentity(walletAdapter))
        .use(mplTokenMetadata());
    }

    setUmi(umi);
  }, [selectedCluster, walletAdapter]);

  return <UmiContext.Provider value={{ umi }}>{children}</UmiContext.Provider>;
};

export function useUmi(): Umi {
  const umi = useContext(UmiContext).umi;

  if (!umi) {
    throw new Error(
      "Umi context was not initialized. " +
      "Did you forget to wrap your app with <UmiProvider />?",
    );
  }

  return umi;
}
