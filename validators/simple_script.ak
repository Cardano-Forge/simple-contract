use aiken/collection/list
use cardano/assets.{PolicyId}
use cardano/transaction.{Transaction}
use time.{must_be_before_lower_bound}

///Simple script simulator to mock the basic time locked policy
validator simple_script {
  mint(_redeemer: Data, _policy_id: PolicyId, self: Transaction) {
    //Until what POSIX time you can mint
    //Mon Dec 31 2029 19:00:00 GMT-0500 (heure normale de l’Est nord-américain)
    let expiration_time = 1893456000000

    //Keyhash that need to sign the transaction
    //"sk":"7B393CEC1C403A0EF805ECE0E16755C9F9E8C797A05278C16A9F02E16E6658F2",
    let signer = #"44de2ad7ed4bbf0a3b47c1a37515340a5bcb34e3f50634b9ccd050ab"

    //Check that the signer is present in the extra_signatories
    let is_signed = list.has(self.extra_signatories, signer)

    //Check that the tx is before the expiration time
    let is_not_expired =
      must_be_before_lower_bound(self.validity_range, expiration_time)

    and {
      is_signed?,
      is_not_expired?,
    }
  }

  else(_) {
    False
  }
}
