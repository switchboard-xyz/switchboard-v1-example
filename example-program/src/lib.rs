use solana_program::{
    account_info::{AccountInfo, next_account_info}, entrypoint,
    entrypoint::ProgramResult, msg, pubkey::Pubkey,
};
use switchboard_program::{
    get_aggregator,
    get_aggregator_result,
    AggregatorState,
    RoundResult,
    fast_parse_switchboard_result,
    SwitchboardAccountType,
};

entrypoint!(process_instruction);

fn process_instruction<'a>(
    program_id: &'a Pubkey,
    accounts: &'a [AccountInfo],
    instruction_data: &'a [u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let switchboard_feed_account = next_account_info(accounts_iter)?;
    let mut out = 0.0;
    if switchboard_feed_account.try_borrow_data()?[0] == SwitchboardAccountType::TYPE_AGGREGATOR as u8 {
        let aggregator: AggregatorState = get_aggregator(switchboard_feed_account)?;
        let round_result: RoundResult = get_aggregator_result(&aggregator)?;
        out = round_result.result.unwrap_or(0.0);
    } else {
        let buf = switchboard_feed_account.try_borrow_data()?;
        let parsed_data = fast_parse_switchboard_result(&buf);
        out = parsed_data.result.result;
    }
    msg!("Current feed result is {}!", &lexical::to_string(out));
    Ok(())
}
