import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CATALOG_SERVICE } from '../../domain/ports/outbound/catalog-service.port.js';
import { PAYMENT_SERVICE } from '../../domain/ports/outbound/payment-service.port.js';
import { USER_SERVICE } from '../../domain/ports/outbound/user-service.port.js';
import { JwtTokenVerifier } from '../auth/jwt-token-verifier.js';
import { ClientsModule } from '../clients/clients.module.js';
import { CatalogHttpAdapter } from '../clients/catalog-http.adapter.js';
import { CatalogStubAdapter } from '../clients/catalog-stub.adapter.js';
import { PaymentsHttpAdapter } from '../clients/payments-http.adapter.js';
import { PaymentsStubAdapter } from '../clients/payments-stub.adapter.js';
import { UsersHttpAdapter } from '../clients/users-http.adapter.js';
import { UsersStubAdapter } from '../clients/users-stub.adapter.js';

@Module({
  imports: [ClientsModule],
  providers: [
    JwtTokenVerifier,
    CatalogHttpAdapter,
    CatalogStubAdapter,
    PaymentsHttpAdapter,
    PaymentsStubAdapter,
    UsersHttpAdapter,
    UsersStubAdapter,
    {
      provide: CATALOG_SERVICE,
      inject: [ConfigService, CatalogHttpAdapter, CatalogStubAdapter],
      useFactory: (
        config: ConfigService,
        http: CatalogHttpAdapter,
        stub: CatalogStubAdapter,
      ) => config.get('CATALOG_ADAPTER', 'stub') === 'http' ? http : stub,
    },
    {
      provide: PAYMENT_SERVICE,
      inject: [ConfigService, PaymentsHttpAdapter, PaymentsStubAdapter],
      useFactory: (
        config: ConfigService,
        http: PaymentsHttpAdapter,
        stub: PaymentsStubAdapter,
      ) => config.get('PAYMENTS_ADAPTER', 'stub') === 'http' ? http : stub,
    },
    {
      provide: USER_SERVICE,
      inject: [ConfigService, UsersHttpAdapter, UsersStubAdapter],
      useFactory: (
        config: ConfigService,
        http: UsersHttpAdapter,
        stub: UsersStubAdapter,
      ) => config.get('USERS_ADAPTER', 'stub') === 'http' ? http : stub,
    },
  ],
  exports: [CATALOG_SERVICE, PAYMENT_SERVICE, USER_SERVICE, JwtTokenVerifier],
})
export class ServiceAdaptersModule {}
