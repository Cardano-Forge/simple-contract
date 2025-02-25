# Clone the Smart Contract Code

```bash
git clone https://github.com/Cardano-Forge/simple-contract.git
```

# Create and Send Funds to wallets

**Create an Admin Wallet  (NO ADA)**

> This is gonna be the wallet required to sign the mint transaction.

```bash
./cardano-wallet-macos-latest --name admin --mnemonic
```

**Create an Operation Wallet (50 ADA)**

> This is gonna be the wallet paying the fee to deploy the Smart Contract.

```bash
./cardano-wallet-macos-latest --name operator --mnemonic
```

**Create a Customer Wallet (20 ADA)**

> This is gonna be the wallet simulating the customer interation. (Pay transaction Fees mainly)

```bash
./cardano-wallet-macos-latest --name customer --mnemonic
```

# Setup Aiken

1. `aiken.toml`

Update the following keys:

- `name`, For example: `mrabdibdi/always-true`
- `description`, For example: `"Aiken contracts for project 'mrabdibdi/always-true'"`
- `user`, For example: `mrabdibdi`

2. `validators/simple_script_ak`

- `let expiration_time = 1893456000000`, you can set the posix time you want. By default it is set to `2029-12-31`.
- `let signer = #"44de2ad7ed4bbf0a3b47c1a37515340a5bcb34e3f50634b9ccd050ab"`, replace `44..ab` with the `key_hash` value from the `admin.json` file.
  - You can also skip that step, if you only want to quickly test how it works, the `SK` is provided in the code, so you can sign the transaction using that one.

3. Build the contract

```bash
aiken build
```

---

# Deploy the Smart Contract

Create a file named `deploy.ts`

This script (*all details are explained in details in the hello-world example (TODO, add link)*)
will upload the smart contract on chain and update anvil backend to facilitate all subsequents interactions.

**This snippet will always be similar for any smart contract deployment on-chain**

```typescript
import { Buffer } from "node:buffer";
import { FixedTransaction, PrivateKey } from "npm:@emurgo/cardano-serialization-lib-nodejs@14.1.0"; // only required due to signing in the backend.

import blueprint from "./simple-contract/plutus.json" with {type: "json"};
import operator from "./operator.json" with {type: "json"};

const X_API_KEY = "CgYuz62xAS7EfM0hCP1gz1aOeHlQ4At36pGwnnLf";
const API_ENDPOINT = "https://preprod.api.ada-anvil.app/v2/services"

const headers = {
  "x-api-key": X_API_KEY,
  "Content-Type": "application/json",
};

function getValidators(validators: typeof blueprint.validators) {
  return [...validators.reduce((a, b) => a.set(b.hash, b) && a, new Map<string, typeof blueprint.validators[number]>()).values()];
}

const blueprintRegistration = await fetch(`${API_ENDPOINT}/blueprints`,
  {
    method: "POST",
    headers,
    body: JSON.stringify({ blueprint })
  });

const uploadedBlueprint = await blueprintRegistration.json();
console.debug("uploadedBlueprint", JSON.stringify(uploadedBlueprint, null, 2))

const { scriptAddresses } = uploadedBlueprint;

const contract = {
  changeAddress: operator.base_address_preprod,
  message: "Smart contract deployed using anvil API",
  outputs: getValidators(blueprint.validators).map(validator => ({
    address: scriptAddresses[validator.hash],
    datum: {
      type: "script",
      hash: validator.hash,
    }
  })),
};

const contractDeployed = await fetch(
  `${API_ENDPOINT}/transactions/build`,
  {
    method: "POST",
    headers,
    body: JSON.stringify(contract),
  }
);

const contractToDeployTransaction = await contractDeployed.json();
console.log("contractToDeployTransaction", JSON.stringify(contractToDeployTransaction));

// Sign the transaction using CSL.
const txToSubmitOnChain = FixedTransaction.from_bytes(
  Buffer.from(contractToDeployTransaction.complete, "hex")
);
txToSubmitOnChain.sign_and_add_vkey_signature(
  PrivateKey.from_bech32(operator.skey)
);

console.log(txToSubmitOnChain.transaction_hash().to_hex());

const urlSubmit = `${API_ENDPOINT}/transactions/submit`;
const submitted = await fetch(urlSubmit, {
  method: "POST",
  body: JSON.stringify({
    signatures: [], // no signature required as it is part of the `txToSubmitOnChain`.
    transaction: txToSubmitOnChain.to_hex(),
  }),
  headers,
});

const response = await submitted.json();
console.debug("response", response);

const { txHash } = response;

const linkBlueprintAndTxHash = await fetch(`${API_ENDPOINT}/blueprints`,
  {
    method: "POST",
    headers,
    body: JSON.stringify({
      blueprint,
      refs: getValidators(blueprint.validators).reduce((a, b, index) => {
        a[b.hash] = { txHash, index };
        return a;
      }, {} as Record<string, { txHash: string, index: number }>),
    })
  });

const updatedBlueprint = await linkBlueprintAndTxHash.json()
console.log("updatedBlueprint", JSON.stringify(updatedBlueprint));
```

- The `policyId` and `hash` (in this case this is the same value for both), can be found in the `plutus.json` in the first validator `validators[0].hash`.

**Launch the script**

```bash
deno run -A deploy.ts
```

This script will return a `TxHash`, and will work first time.

> **Note**: If you made a mistake and nee to update the smart contract (or when the hash changes), you can run the `deploy.ts` script again to overwrite the blueprint in anvil backend, if you do not want to overwrite it, you need to change the name of your contract.
---

# How to mint an Asset

TODO: Explain this payload in details.

**The payload to use**

```json
{
    "changeAddress":"CUSTOMER_ADDRESS",
    "message":"Minting with anvil-api of the simple script example",
    "mint":[
        {
        "version":"cip25",
        "assetName":"AN_ASSET_NAME_YOU_WANT",
        "policyId":"SMART_CONTRACT_HASH",
        "type":"plutus",
        "quantity":1,
        "metadata":{}
    } ],
    "scriptInteractions": [
    {
      "purpose": "mint",
      "hash": "SMART_CONTRACT_HASH",
      "redeemer": {
        "type": "hex",
        "value": "00",
      } // There is no redeemer in this specific example.
    }
  ],
  "requiredSigners":["ADMIN_KEY_HASH"]
}
```

> Allows be careful when using a wallet that sign behind the scene, it must never have ADA on it.

Create a `mint.ts` script

```typescript
import { Buffer } from "node:buffer";
import {
  FixedTransaction,
  PrivateKey,
} from "npm:@emurgo/cardano-serialization-lib-nodejs@14.1.0"; // only required due to signing in the backend.

import customer from "../../customer.json" with { type: "json" };
import admin from "../../admin.json" with { type: "json" };

const X_API_KEY = "CgYuz62xAS7EfM0hCP1gz1aOeHlQ4At36pGwnnLf";
const API_ENDPOINT = "https://preprod.api.ada-anvil.app/v2/services";

const headers = {
  "x-api-key": X_API_KEY,
  "Content-Type": "application/json",
};

// NOTE: Update to match your released Smart Contract hash
const hash = "eb7bddc5b588e238d2974d544a479b6bc0dc06852b38d12308ac62e5";

const input = {
  changeAddress: customer.base_address_preprod,
  message: "Minting with anvil-api of the simple script example",
  mint: [
    {
      version: "cip25",
      assetName: "anvil_doc_1",
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
      }, // Empty Array Tag 122, it does nothing in this case.
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
```
