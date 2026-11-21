import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Token incluido en el enlace recibido por correo.',
    example: 'pega-aqui-el-token-del-correo',
  })
  @IsString()
  @MinLength(1)
  token!: string;
}
