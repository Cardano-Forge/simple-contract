import { Buffer } from "node:buffer";
import {
  FixedTransaction,
  PrivateKey,
} from "npm:@emurgo/cardano-serialization-lib-nodejs@14.1.0"; // only required due to signing in the backend.

import customer from "./customer.json" with { type: "json" };
import admin from "./admin.json" with { type: "json" };

const X_API_KEY = "CgYuz62xAS7EfM0hCP1gz1aOeHlQ4At36pGwnnLf";
const API_ENDPOINT = "https://preprod.api.ada-anvil.app/v2/services";

const headers = {
  "x-api-key": X_API_KEY,
  "Content-Type": "application/json",
};

// Update to fit your released Smart Contract hash
const hash = "888f9fe900850da3b543f8736582940ef8fe7e84208abaa88b7f4513";

const input = {
  changeAddress: customer.base_address_preprod,
  message: "Minting with anvil-api of the simple script example",
  mint: [
    {
      version: "cip25",
      assetName: "mrabdibdi_1",
      assetNameFormat: "utf8",
      policyId: hash,
      type: "plutus",
      quantity: 1,
      metadata: {
        foo: "bar",
      },
    },
  ],
  scriptInteractions: [
    {
      purpose: "mint",
      hash: hash,
      redeemer: {
        type: "hex",
        value: "00",
      }, // Empty Constructor, it does nothing in this case.
    },
  ],
  requiredSigners: [admin.key_hash],
};

const response = await fetch(`${API_ENDPOINT}/transactions/build`, {
  method: "POST",
  headers,
  body: JSON.stringify(input),
});

const result = await response.json();
console.log("result", result);
const txToSign = result.complete;

// Sign the Transaction with Customer wallet (Usually done with the browser extensions)
const txSignedByCustomerAndAdminWallets = FixedTransaction.from_bytes(
  Buffer.from(txToSign, "hex"),
);
// This sign the tx and add vkeys to the txSignedByCustomerAndAdminWallets, so in submit we don't need to provide signatures
txSignedByCustomerAndAdminWallets.sign_and_add_vkey_signature(
  PrivateKey.from_bech32(customer.skey),
);

// Sign the Transaction with Admin wallet, be careful.
txSignedByCustomerAndAdminWallets.sign_and_add_vkey_signature(
  PrivateKey.from_bech32(admin.skey),
);

const urlSubmit = `${API_ENDPOINT}/transactions/submit`;
const submitted = await fetch(urlSubmit, {
  method: "POST",
  headers,
  body: JSON.stringify({
    signatures: [], // no signature required as it is part of the `txToSubmitOnChain`.
    transaction: txSignedByCustomerAndAdminWallets.to_hex(),
  }),
});

const submittedResponse = await submitted.json();
console.debug("submittedResponse", submittedResponse);
