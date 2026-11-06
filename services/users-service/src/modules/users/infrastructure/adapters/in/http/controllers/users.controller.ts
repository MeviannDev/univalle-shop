import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../../../../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../../../../../common/decorators/roles.decorator.js';
import type { AccessTokenClaims } from '../../../../../../auth/domain/ports/token.service.js';
import { JwtAuthGuard } from '../../../../../../auth/infrastructure/adapters/in/http/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../../../../auth/infrastructure/adapters/in/http/guards/roles.guard.js';
import { ActivateUser } from '../../../../../application/use-cases/activate-user.js';
import { AddAddress } from '../../../../../application/use-cases/add-address.js';
import { ChangePassword } from '../../../../../application/use-cases/change-password.js';
import { ChangeUserRole } from '../../../../../application/use-cases/change-user-role.js';
import { GetProfile } from '../../../../../application/use-cases/get-profile.js';
import { ListUsers } from '../../../../../application/use-cases/list-users.js';
import { RemoveAddress } from '../../../../../application/use-cases/remove-address.js';
import { SetDefaultAddress } from '../../../../../application/use-cases/set-default-address.js';
import { SuspendUser } from '../../../../../application/use-cases/suspend-user.js';
import { UpdateAddress } from '../../../../../application/use-cases/update-address.js';
import { UpdateProfile } from '../../../../../application/use-cases/update-profile.js';
import { AddressDto, UpdateAddressDto } from '../dto/address.dto.js';
import { ChangePasswordDto } from '../dto/change-password.dto.js';
import { ChangeUserRoleDto, UpdateUserStatusDto } from '../dto/admin.dto.js';
import { UpdateProfileDto } from '../dto/update-profile.dto.js';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly getProfile: GetProfile,
    private readonly updateProfile: UpdateProfile,
    private readonly changePassword: ChangePassword,
    private readonly addAddress: AddAddress,
    private readonly updateAddress: UpdateAddress,
    private readonly removeAddress: RemoveAddress,
    private readonly setDefaultAddress: SetDefaultAddress,
    private readonly listUsers: ListUsers,
    private readonly suspendUser: SuspendUser,
    private readonly activateUser: ActivateUser,
    private readonly changeUserRole: ChangeUserRole,
  ) {}

  @Get('me')
  getMyProfile(@CurrentUser() user: AccessTokenClaims) {
    return this.getProfile.execute(user.sub);
  }

  @Patch('me')
  updateMyProfile(
    @CurrentUser() user: AccessTokenClaims,
    @Body() body: UpdateProfileDto,
  ) {
    return this.updateProfile.execute(user.sub, body);
  }

  @Patch('me/password')
  async changeMyPassword(
    @CurrentUser() user: AccessTokenClaims,
    @Body() body: ChangePasswordDto,
  ) {
    await this.changePassword.execute(
      user.sub,
      body.currentPassword,
      body.newPassword,
    );
    return { changed: true };
  }

  @Post('me/addresses')
  addMyAddress(
    @CurrentUser() user: AccessTokenClaims,
    @Body() body: AddressDto,
  ) {
    return this.addAddress.execute(user.sub, body);
  }

  @Patch('me/addresses/:id')
  updateMyAddress(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id') id: string,
    @Body() body: UpdateAddressDto,
  ) {
    return this.updateAddress.execute(user.sub, id, body);
  }

  @Delete('me/addresses/:id')
  removeMyAddress(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id') id: string,
  ) {
    return this.removeAddress.execute(user.sub, id);
  }

  @Patch('me/addresses/:id/default')
  setMyDefaultAddress(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id') id: string,
  ) {
    return this.setDefaultAddress.execute(user.sub, id);
  }

  @Get()
  @Roles('ADMIN')
  list(@CurrentUser() user: AccessTokenClaims) {
    return this.listUsers.execute(user.role);
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  updateStatus(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id') id: string,
    @Body() body: UpdateUserStatusDto,
  ) {
    return body.status === 'SUSPENDED'
      ? this.suspendUser.execute(id, user.sub, user.role)
      : this.activateUser.execute(id, user.role);
  }

  @Patch(':id/role')
  @Roles('ADMIN')
  changeRole(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id') id: string,
    @Body() body: ChangeUserRoleDto,
  ) {
    return this.changeUserRole.execute({
      userId: id,
      actorId: user.sub,
      actorRole: user.role,
      role: body.role,
    });
  }
}
