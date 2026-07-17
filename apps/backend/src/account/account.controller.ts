import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { UserId } from '../auth/user-id.decorator';
import { AccountService } from './account.service';

/**
 * `POST /v1/account/delete` (07 §7, 03 §5).
 *
 * The id comes from the verified JWT via `@UserId()` — there is no body, and
 * deliberately no way to name a different user. A deletion endpoint that accepted
 * a target id would be a way to erase someone else's life.
 */
@Controller({ path: 'account', version: '1' })
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Post('delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@UserId() userId: string): Promise<void> {
    await this.account.deleteAccount(userId);
  }
}
