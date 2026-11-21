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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
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
import { UserProfileResponseDto } from '../dto/user-profile-response.dto.js';

@Controller('users')
@ApiTags('Usuarios')
@ApiBearerAuth()
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
  @ApiOperation({
    summary: 'Obtener mi perfil',
    description:
      'Devuelve el perfil del usuario autenticado y sus direcciones.',
  })
  @ApiOkResponse({ type: UserProfileResponseDto })
  getMyProfile(@CurrentUser() user: AccessTokenClaims) {
    return this.getProfile.execute(user.sub);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Actualizar mi perfil',
    description:
      'Actualiza uno o más campos del perfil. Los campos omitidos conservan su valor.',
  })
  @ApiBody({
    type: UpdateProfileDto,
    examples: {
      actualizarPerfil: {
        summary: 'Actualizar nombre y vinculación',
        value: {
          firstName: 'Ana María',
          lastName: 'Valencia',
          primaryPhone: '+57 300 1234567',
          marketingConsent: true,
          vinculationType: 'ESTUDIANTE',
        },
      },
    },
  })
  @ApiOkResponse({ type: UserProfileResponseDto })
  updateMyProfile(
    @CurrentUser() user: AccessTokenClaims,
    @Body() body: UpdateProfileDto,
  ) {
    return this.updateProfile.execute(user.sub, body);
  }

  @Patch('me/password')
  @ApiOperation({
    summary: 'Cambiar mi contraseña',
    description:
      'Cambia la contraseña del usuario autenticado. Se debe proporcionar la contraseña actual y una nueva contraseña de al menos 8 caracteres.',
  })
  @ApiBody({
    type: ChangePasswordDto,
    examples: {
      cambiarContrasena: {
        summary: 'Cambio de contraseña',
        value: {
          currentPassword: 'Valle2026!',
          newPassword: 'ValleNuevo2026!',
        },
      },
    },
  })
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
  @ApiOperation({
    summary: 'Agregar una dirección',
    description:
      'Agrega una dirección a la cuenta autenticada. Se permiten hasta cinco direcciones por usuario.',
  })
  @ApiBody({
    type: AddressDto,
    examples: {
      direccionPrincipal: {
        summary: 'Dirección predeterminada',
        value: {
          street: 'Calle 13 # 100-00',
          city: 'Cali',
          department: 'Valle del Cauca',
          phone: '+57 300 1234567',
          isDefault: true,
        },
      },
    },
  })
  addMyAddress(
    @CurrentUser() user: AccessTokenClaims,
    @Body() body: AddressDto,
  ) {
    return this.addAddress.execute(user.sub, body);
  }

  @Patch('me/addresses/:id')
  @ApiOperation({
    summary: 'Actualizar una dirección',
    description:
      'Actualiza parcialmente una dirección propia. Los campos omitidos no cambian.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador de la dirección.',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({
    type: UpdateAddressDto,
    examples: {
      actualizarDireccion: {
        summary: 'Cambiar calle y teléfono',
        value: {
          street: 'Calle 14 # 100-00',
          phone: '+57 300 1234567',
        },
      },
    },
  })
  updateMyAddress(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id') id: string,
    @Body() body: UpdateAddressDto,
  ) {
    return this.updateAddress.execute(user.sub, id, body);
  }

  @Delete('me/addresses/:id')
  @ApiOperation({
    summary: 'Eliminar una dirección',
    description: 'Elimina una dirección perteneciente al usuario autenticado.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador de la dirección.',
    example: '507f1f77bcf86cd799439011',
  })
  removeMyAddress(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id') id: string,
  ) {
    return this.removeAddress.execute(user.sub, id);
  }

  @Patch('me/addresses/:id/default')
  @ApiOperation({
    summary: 'Marcar una dirección como predeterminada',
    description:
      'Establece como predeterminada una dirección perteneciente al usuario autenticado.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador de la dirección.',
    example: '507f1f77bcf86cd799439011',
  })
  setMyDefaultAddress(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id') id: string,
  ) {
    return this.setDefaultAddress.execute(user.sub, id);
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Listar usuarios',
    description: 'Devuelve la lista de usuarios. Requiere el rol ADMIN.',
  })
  list(@CurrentUser() user: AccessTokenClaims) {
    return this.listUsers.execute(user.role);
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Cambiar el estado de un usuario',
    description: 'Suspende o reactiva una cuenta. Requiere el rol ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador del usuario que se actualizará.',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({
    type: UpdateUserStatusDto,
    examples: {
      suspender: {
        summary: 'Suspender cuenta',
        value: { status: 'SUSPENDED' },
      },
      reactivar: {
        summary: 'Reactivar cuenta',
        value: { status: 'ACTIVE' },
      },
    },
  })
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
  @ApiOperation({
    summary: 'Cambiar el rol de un usuario',
    description:
      'Asigna el rol CUSTOMER o ADMIN a una cuenta. Requiere el rol ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador del usuario que se actualizará.',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({
    type: ChangeUserRoleDto,
    examples: {
      cliente: {
        summary: 'Asignar rol CUSTOMER',
        value: { role: 'CUSTOMER' },
      },
      administrador: {
        summary: 'Asignar rol ADMIN',
        value: { role: 'ADMIN' },
      },
    },
  })
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
