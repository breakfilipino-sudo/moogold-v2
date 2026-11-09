import EwalletDepositPage from "../../ewallet-deposit-page";

export default function MayaDepositStartPage() {
  return (
    <EwalletDepositPage
      method="MAYA"
      expectedCountry="PH"
      submitLabel="Continue"
    />
  );
}