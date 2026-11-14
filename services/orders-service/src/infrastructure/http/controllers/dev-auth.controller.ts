import { Body, Controller, NotFoundException, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { JwtTokenVerifier } from '../../auth/jwt-token-verifier.js';
import type { UserRole } from '../../../domain/ports/outbound/user-service.port.js';

class DevTokenRequestDto {
  @ApiProperty({ enum: ['CUSTOMER', 'ADMIN'], example: 'CUSTOMER' })
  @IsIn(['CUSTOMER', 'ADMIN'])
  role!: UserRole;

  @ApiProperty({ enum: ['test-customer', 'test-customer-2', 'test-admin'], required: false })
  @IsOptional()
  @IsIn(['test-customer', 'test-customer-2', 'test-admin'])
  subject?: string;
}

@ApiTags('development')
@Controller('dev/auth')
export class DevAuthController {
  constructor(
    private readonly verifier: JwtTokenVerifier,
    private readonly config: ConfigService,
  ) {}

  @Post('token')
  @ApiOperation({ summary: 'Emitir token JWT de prueba (solo adaptador stub)' })
  async issueToken(@Body() body: DevTokenRequestDto) {
    if (
      this.config.get('NODE_ENV') === 'production' ||
      this.config.get('USERS_ADAPTER', 'stub') !== 'stub'
    ) {
      throw new NotFoundException();
    }
    const subject =
      body.subject ??
      (body.role === 'ADMIN' ? 'test-admin' : 'test-customer');
    if ((subject === 'test-admin') !== (body.role === 'ADMIN')) {
      throw new NotFoundException();
    }
    return {
      accessToken: this.verifier.signDevelopmentToken(subject, body.role),
      tokenType: 'Bearer',
      expiresIn: 3600,
    };
  }
}
