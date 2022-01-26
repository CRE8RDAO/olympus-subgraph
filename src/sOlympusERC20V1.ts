import { RebaseCall } from "../generated/sBrickERC20V1/sBrickERC20";
import { BrickERC20 } from "../generated/sBrickERC20V1/BrickERC20";
import { createDailyStakingReward } from "./utils/DailyStakingReward";
import { loadOrCreateTransaction } from "./utils/Transactions";
import { Rebase } from "../generated/schema";
import { Address, BigDecimal, BigInt, log } from "@graphprotocol/graph-ts";
import { BRICK_ERC20_CONTRACT, STAKING_CONTRACT_V1 } from "./utils/Constants";
import { toDecimal } from "./utils/Decimals";
import { getBRICKUSDRate } from "./utils/Price";

export function rebaseFunction(call: RebaseCall): void {
  let transaction = loadOrCreateTransaction(call.transaction, call.block);
  var rebase = Rebase.load(transaction.id);
  log.debug("Rebase_V1 event on TX {} with amount {}", [
    transaction.id,
    toDecimal(call.inputs.profit_, 9).toString(),
  ]);

  if (rebase == null && call.inputs.profit_.gt(BigInt.fromI32(0))) {
    let brick_contract = BrickERC20.bind(
      Address.fromString(BRICK_ERC20_CONTRACT)
    );

    rebase = new Rebase(transaction.id);
    rebase.amount = toDecimal(call.inputs.profit_, 9);
    rebase.stakedBricks = toDecimal(
      brick_contract.balanceOf(Address.fromString(STAKING_CONTRACT_V1)),
      9
    );
    rebase.contract = STAKING_CONTRACT_V1;
    rebase.percentage = rebase.amount.div(rebase.stakedBricks);
    rebase.transaction = transaction.id;
    rebase.timestamp = transaction.timestamp;
    rebase.value = rebase.amount.times(getBRICKUSDRate());
    rebase.save();

    createDailyStakingReward(rebase.timestamp, rebase.amount);
  }
}
