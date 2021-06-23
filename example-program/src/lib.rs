use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};
use switchboard_program::{
    get_aggregator, get_aggregator_result, AggregatorState, FastRoundResultAccountData,
    RoundResult, SwitchboardAccountType,
};

entrypoint!(process_instruction);

fn process_instruction<'a>(
    _program_id: &'a Pubkey,
    accounts: &'a [AccountInfo],
    _instruction_data: &'a [u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let switchboard_feed_account = next_account_info(accounts_iter)?;
    let mut out = 0.0;
    let account_buf = switchboard_feed_account.try_borrow_data()?;
    if account_buf[0] == SwitchboardAccountType::TYPE_AGGREGATOR as u8 {
        let aggregator: AggregatorState = get_aggregator(switchboard_feed_account)
            .map_err(|e| {
                msg!("Aggregator parse failed. Please double check the provided address.");
                return e;
            })?;
        let round_result: RoundResult = get_aggregator_result(&aggregator)
            .map_err(|e| {
                msg!("Failed to parse an aggregator round. Has update been called on the aggregator?");
                return e;
            })?;
        out = round_result.result.unwrap_or(0.0);
    } else if account_buf[0] == SwitchboardAccountType::TYPE_AGGREGATOR_RESULT_PARSE_OPTIMIZED as u8 {
        let feed_data = FastRoundResultAccountData::deserialize(&account_buf).unwrap();
        out = feed_data.result.result;
    } else {
        return Err(ProgramError::InvalidAccountData);
    }
    msg!("Current feed result is {}!", &lexical::to_string(out));
    Ok(())
}
