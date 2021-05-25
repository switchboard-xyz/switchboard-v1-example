use solana_program::{
    account_info::{AccountInfo, next_account_info}, entrypoint,
    entrypoint::ProgramResult, msg, pubkey::Pubkey,
};
use switchboard_program::{get_aggregator, get_aggregator_result,
    AggregatorState, RoundResult};

entrypoint!(process_instruction);

fn process_instruction<'a>(
    program_id: &'a Pubkey,
    accounts: &'a [AccountInfo],
    instruction_data: &'a [u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let switchboard_feed_account = next_account_info(accounts_iter)?;
    let aggregator: AggregatorState = get_aggregator(switchboard_feed_account)?;
    let round_result: RoundResult = get_aggregator_result(&aggregator)?;
    msg!("Current feed result is {}!", &lexical::to_string(round_result.result.unwrap()));
    Ok(())
}
