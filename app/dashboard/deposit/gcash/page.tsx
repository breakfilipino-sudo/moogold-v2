import EwalletDepositPage from "../ewallet-deposit-page";

export default function GcashDepositPage() {
  return <EwalletDepositPage method="GCASH" expectedCountry="PH" submitLabel="Continue" />;
}