use aiken/interval.{Finite, Interval}

pub fn must_be_before_lower_bound(range: Interval<Int>, start_time: Int) -> Bool {
  when range.lower_bound.bound_type is {
    Finite(tx_earliest_time) -> start_time <= tx_earliest_time
    _ -> False
  }
}
