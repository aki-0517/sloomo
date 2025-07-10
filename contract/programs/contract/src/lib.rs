use anchor_lang::prelude::*;

declare_id!("F4Cq84a2mtt4cH8eKP4bWf4K3td7gHYzjyM1HP7SirdS");

#[program]
pub mod contract {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
