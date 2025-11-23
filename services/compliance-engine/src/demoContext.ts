const CONTEXT: Record<
  string,
  {
    label: string;
    countryCode: string;
  }
> = {
  "0x1111111111111111111111111111111111111111": { label: "Northwind Markets", countryCode: "USA" },
  "0x2222222222222222222222222222222222222222": { label: "Maple Trading", countryCode: "CAN" },
  "0x3333333333333333333333333333333333333333": { label: "Obscura Holdings", countryCode: "RUS" },
  "0x4444444444444444444444444444444444444444": { label: "Canal Remittances", countryCode: "PAN" },
};

export function getWalletContext(address: string) {
  return CONTEXT[address.toLowerCase()] ?? { label: "Unknown Wallet", countryCode: "PAN" };
}

