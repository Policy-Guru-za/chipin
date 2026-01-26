/* eslint-disable max-lines */

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ChipIn Public API',
    version: '1.0.0',
    description: 'Partner API for Dream Boards, contributions, payouts, and webhooks.',
  },
  servers: [
    {
      url: 'https://api.chipin.co.za/v1',
      description: 'Production',
    },
    {
      url: 'http://localhost:3000/api/v1',
      description: 'Local development',
    },
  ],
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
  tags: [
    {
      name: 'Dream Boards',
      description: 'Create and retrieve Dream Boards.',
    },
    {
      name: 'Contributions',
      description: 'Read contribution records.',
    },
    {
      name: 'Payouts',
      description: 'Manage payout status updates.',
    },
    {
      name: 'Webhooks',
      description: 'Create and manage webhook subscriptions.',
    },
  ],
  paths: {
    '/dream-boards': {
      get: {
        tags: ['Dream Boards'],
        summary: 'List dream boards',
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: {
              $ref: '#/components/schemas/DreamBoardStatus',
            },
          },
          {
            name: 'limit',
            in: 'query',
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20,
            },
          },
          {
            name: 'after',
            in: 'query',
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Dream boards list',
            headers: {
              'X-RateLimit-Limit': {
                $ref: '#/components/headers/RateLimitLimit',
              },
              'X-RateLimit-Remaining': {
                $ref: '#/components/headers/RateLimitRemaining',
              },
              'X-RateLimit-Reset': {
                $ref: '#/components/headers/RateLimitReset',
              },
            },
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/DreamBoardListResponse',
                },
              },
            },
          },
          '400': {
            $ref: '#/components/responses/ValidationError',
          },
          '401': {
            $ref: '#/components/responses/UnauthorizedError',
          },
          '403': {
            $ref: '#/components/responses/ForbiddenError',
          },
          '429': {
            $ref: '#/components/responses/RateLimitError',
          },
          '500': {
            $ref: '#/components/responses/InternalError',
          },
        },
      },
      post: {
        tags: ['Dream Boards'],
        summary: 'Create a dream board',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/DreamBoardCreateRequest',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Dream board created',
            headers: {
              'X-RateLimit-Limit': {
                $ref: '#/components/headers/RateLimitLimit',
              },
              'X-RateLimit-Remaining': {
                $ref: '#/components/headers/RateLimitRemaining',
              },
              'X-RateLimit-Reset': {
                $ref: '#/components/headers/RateLimitReset',
              },
            },
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/DreamBoardResponse',
                },
              },
            },
          },
          '400': {
            $ref: '#/components/responses/ValidationError',
          },
          '401': {
            $ref: '#/components/responses/UnauthorizedError',
          },
          '403': {
            $ref: '#/components/responses/ForbiddenError',
          },
          '409': {
            $ref: '#/components/responses/ConflictError',
          },
          '429': {
            $ref: '#/components/responses/RateLimitError',
          },
          '500': {
            $ref: '#/components/responses/InternalError',
          },
        },
      },
    },
    '/dream-boards/{id}': {
      get: {
        tags: ['Dream Boards'],
        summary: 'Get a dream board',
        parameters: [
          {
            $ref: '#/components/parameters/DreamBoardId',
          },
        ],
        responses: {
          '200': {
            description: 'Dream board',
            headers: {
              'X-RateLimit-Limit': {
                $ref: '#/components/headers/RateLimitLimit',
              },
              'X-RateLimit-Remaining': {
                $ref: '#/components/headers/RateLimitRemaining',
              },
              'X-RateLimit-Reset': {
                $ref: '#/components/headers/RateLimitReset',
              },
            },
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/DreamBoardResponse',
                },
              },
            },
          },
          '400': {
            $ref: '#/components/responses/ValidationError',
          },
          '401': {
            $ref: '#/components/responses/UnauthorizedError',
          },
          '403': {
            $ref: '#/components/responses/ForbiddenError',
          },
          '404': {
            $ref: '#/components/responses/NotFoundError',
          },
          '429': {
            $ref: '#/components/responses/RateLimitError',
          },
          '500': {
            $ref: '#/components/responses/InternalError',
          },
        },
      },
    },
    '/dream-boards/{id}/contributions': {
      get: {
        tags: ['Contributions'],
        summary: 'List contributions for a dream board',
        parameters: [
          {
            $ref: '#/components/parameters/DreamBoardId',
          },
          {
            name: 'status',
            in: 'query',
            schema: {
              $ref: '#/components/schemas/ContributionStatus',
            },
          },
          {
            name: 'limit',
            in: 'query',
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20,
            },
          },
          {
            name: 'after',
            in: 'query',
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Contribution list',
            headers: {
              'X-RateLimit-Limit': {
                $ref: '#/components/headers/RateLimitLimit',
              },
              'X-RateLimit-Remaining': {
                $ref: '#/components/headers/RateLimitRemaining',
              },
              'X-RateLimit-Reset': {
                $ref: '#/components/headers/RateLimitReset',
              },
            },
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ContributionListResponse',
                },
              },
            },
          },
          '400': {
            $ref: '#/components/responses/ValidationError',
          },
          '401': {
            $ref: '#/components/responses/UnauthorizedError',
          },
          '403': {
            $ref: '#/components/responses/ForbiddenError',
          },
          '404': {
            $ref: '#/components/responses/NotFoundError',
          },
          '429': {
            $ref: '#/components/responses/RateLimitError',
          },
          '500': {
            $ref: '#/components/responses/InternalError',
          },
        },
      },
    },
    '/contributions/{id}': {
      get: {
        tags: ['Contributions'],
        summary: 'Get a contribution',
        parameters: [
          {
            $ref: '#/components/parameters/ContributionId',
          },
        ],
        responses: {
          '200': {
            description: 'Contribution',
            headers: {
              'X-RateLimit-Limit': {
                $ref: '#/components/headers/RateLimitLimit',
              },
              'X-RateLimit-Remaining': {
                $ref: '#/components/headers/RateLimitRemaining',
              },
              'X-RateLimit-Reset': {
                $ref: '#/components/headers/RateLimitReset',
              },
            },
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ContributionResponse',
                },
              },
            },
          },
          '400': {
            $ref: '#/components/responses/ValidationError',
          },
          '401': {
            $ref: '#/components/responses/UnauthorizedError',
          },
          '403': {
            $ref: '#/components/responses/ForbiddenError',
          },
          '404': {
            $ref: '#/components/responses/NotFoundError',
          },
          '429': {
            $ref: '#/components/responses/RateLimitError',
          },
          '500': {
            $ref: '#/components/responses/InternalError',
          },
        },
      },
    },
    '/payouts/pending': {
      get: {
        tags: ['Payouts'],
        summary: 'List pending payouts',
        parameters: [
          {
            name: 'type',
            in: 'query',
            schema: {
              $ref: '#/components/schemas/PayoutType',
            },
          },
          {
            name: 'limit',
            in: 'query',
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20,
            },
          },
          {
            name: 'after',
            in: 'query',
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Pending payout list',
            headers: {
              'X-RateLimit-Limit': {
                $ref: '#/components/headers/RateLimitLimit',
              },
              'X-RateLimit-Remaining': {
                $ref: '#/components/headers/RateLimitRemaining',
              },
              'X-RateLimit-Reset': {
                $ref: '#/components/headers/RateLimitReset',
              },
            },
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PayoutListResponse',
                },
              },
            },
          },
          '400': {
            $ref: '#/components/responses/ValidationError',
          },
          '401': {
            $ref: '#/components/responses/UnauthorizedError',
          },
          '403': {
            $ref: '#/components/responses/ForbiddenError',
          },
          '429': {
            $ref: '#/components/responses/RateLimitError',
          },
          '500': {
            $ref: '#/components/responses/InternalError',
          },
        },
      },
    },
    '/payouts/{id}': {
      get: {
        tags: ['Payouts'],
        summary: 'Get a payout',
        parameters: [
          {
            $ref: '#/components/parameters/PayoutId',
          },
        ],
        responses: {
          '200': {
            description: 'Payout',
            headers: {
              'X-RateLimit-Limit': {
                $ref: '#/components/headers/RateLimitLimit',
              },
              'X-RateLimit-Remaining': {
                $ref: '#/components/headers/RateLimitRemaining',
              },
              'X-RateLimit-Reset': {
                $ref: '#/components/headers/RateLimitReset',
              },
            },
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PayoutResponse',
                },
              },
            },
          },
          '400': {
            $ref: '#/components/responses/ValidationError',
          },
          '401': {
            $ref: '#/components/responses/UnauthorizedError',
          },
          '403': {
            $ref: '#/components/responses/ForbiddenError',
          },
          '404': {
            $ref: '#/components/responses/NotFoundError',
          },
          '429': {
            $ref: '#/components/responses/RateLimitError',
          },
          '500': {
            $ref: '#/components/responses/InternalError',
          },
        },
      },
    },
    '/payouts/{id}/confirm': {
      post: {
        tags: ['Payouts'],
        summary: 'Confirm a payout',
        parameters: [
          {
            $ref: '#/components/parameters/PayoutId',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/PayoutConfirmRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Payout confirmed',
            headers: {
              'X-RateLimit-Limit': {
                $ref: '#/components/headers/RateLimitLimit',
              },
              'X-RateLimit-Remaining': {
                $ref: '#/components/headers/RateLimitRemaining',
              },
              'X-RateLimit-Reset': {
                $ref: '#/components/headers/RateLimitReset',
              },
            },
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PayoutResponse',
                },
              },
            },
          },
          '400': {
            $ref: '#/components/responses/ValidationError',
          },
          '401': {
            $ref: '#/components/responses/UnauthorizedError',
          },
          '403': {
            $ref: '#/components/responses/ForbiddenError',
          },
          '404': {
            $ref: '#/components/responses/NotFoundError',
          },
          '429': {
            $ref: '#/components/responses/RateLimitError',
          },
          '500': {
            $ref: '#/components/responses/InternalError',
          },
        },
      },
    },
    '/payouts/{id}/fail': {
      post: {
        tags: ['Payouts'],
        summary: 'Fail a payout',
        parameters: [
          {
            $ref: '#/components/parameters/PayoutId',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/PayoutFailRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Payout failed',
            headers: {
              'X-RateLimit-Limit': {
                $ref: '#/components/headers/RateLimitLimit',
              },
              'X-RateLimit-Remaining': {
                $ref: '#/components/headers/RateLimitRemaining',
              },
              'X-RateLimit-Reset': {
                $ref: '#/components/headers/RateLimitReset',
              },
            },
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PayoutResponse',
                },
              },
            },
          },
          '400': {
            $ref: '#/components/responses/ValidationError',
          },
          '401': {
            $ref: '#/components/responses/UnauthorizedError',
          },
          '403': {
            $ref: '#/components/responses/ForbiddenError',
          },
          '404': {
            $ref: '#/components/responses/NotFoundError',
          },
          '429': {
            $ref: '#/components/responses/RateLimitError',
          },
          '500': {
            $ref: '#/components/responses/InternalError',
          },
        },
      },
    },
    '/webhooks': {
      get: {
        tags: ['Webhooks'],
        summary: 'List webhook endpoints',
        responses: {
          '200': {
            description: 'Webhook list',
            headers: {
              'X-RateLimit-Limit': {
                $ref: '#/components/headers/RateLimitLimit',
              },
              'X-RateLimit-Remaining': {
                $ref: '#/components/headers/RateLimitRemaining',
              },
              'X-RateLimit-Reset': {
                $ref: '#/components/headers/RateLimitReset',
              },
            },
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/WebhookListResponse',
                },
              },
            },
          },
          '401': {
            $ref: '#/components/responses/UnauthorizedError',
          },
          '403': {
            $ref: '#/components/responses/ForbiddenError',
          },
          '429': {
            $ref: '#/components/responses/RateLimitError',
          },
          '500': {
            $ref: '#/components/responses/InternalError',
          },
        },
      },
      post: {
        tags: ['Webhooks'],
        summary: 'Create webhook endpoint',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/WebhookCreateRequest',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Webhook created',
            headers: {
              'X-RateLimit-Limit': {
                $ref: '#/components/headers/RateLimitLimit',
              },
              'X-RateLimit-Remaining': {
                $ref: '#/components/headers/RateLimitRemaining',
              },
              'X-RateLimit-Reset': {
                $ref: '#/components/headers/RateLimitReset',
              },
            },
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/WebhookResponse',
                },
              },
            },
          },
          '400': {
            $ref: '#/components/responses/ValidationError',
          },
          '401': {
            $ref: '#/components/responses/UnauthorizedError',
          },
          '403': {
            $ref: '#/components/responses/ForbiddenError',
          },
          '429': {
            $ref: '#/components/responses/RateLimitError',
          },
          '500': {
            $ref: '#/components/responses/InternalError',
          },
        },
      },
    },
    '/webhooks/{id}': {
      delete: {
        tags: ['Webhooks'],
        summary: 'Deactivate webhook endpoint',
        parameters: [
          {
            $ref: '#/components/parameters/WebhookId',
          },
        ],
        responses: {
          '200': {
            description: 'Webhook deactivated',
            headers: {
              'X-RateLimit-Limit': {
                $ref: '#/components/headers/RateLimitLimit',
              },
              'X-RateLimit-Remaining': {
                $ref: '#/components/headers/RateLimitRemaining',
              },
              'X-RateLimit-Reset': {
                $ref: '#/components/headers/RateLimitReset',
              },
            },
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/WebhookDeleteResponse',
                },
              },
            },
          },
          '400': {
            $ref: '#/components/responses/ValidationError',
          },
          '401': {
            $ref: '#/components/responses/UnauthorizedError',
          },
          '403': {
            $ref: '#/components/responses/ForbiddenError',
          },
          '404': {
            $ref: '#/components/responses/NotFoundError',
          },
          '429': {
            $ref: '#/components/responses/RateLimitError',
          },
          '500': {
            $ref: '#/components/responses/InternalError',
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
        description: 'Bearer cpk_live_xxx or cpk_test_xxx',
      },
    },
    parameters: {
      DreamBoardId: {
        name: 'id',
        in: 'path',
        required: true,
        schema: {
          type: 'string',
          pattern: '^[a-zA-Z0-9-]+$',
          maxLength: 100,
        },
        description: 'Public dream board identifier.',
      },
      ContributionId: {
        name: 'id',
        in: 'path',
        required: true,
        schema: {
          type: 'string',
          format: 'uuid',
        },
        description: 'Contribution identifier.',
      },
      PayoutId: {
        name: 'id',
        in: 'path',
        required: true,
        schema: {
          type: 'string',
          format: 'uuid',
        },
        description: 'Payout identifier.',
      },
      WebhookId: {
        name: 'id',
        in: 'path',
        required: true,
        schema: {
          type: 'string',
          format: 'uuid',
        },
        description: 'Webhook endpoint identifier.',
      },
    },
    headers: {
      RateLimitLimit: {
        schema: {
          type: 'integer',
        },
        description: 'Hourly rate limit quota.',
      },
      RateLimitRemaining: {
        schema: {
          type: 'integer',
        },
        description: 'Remaining requests in the current window.',
      },
      RateLimitReset: {
        schema: {
          type: 'integer',
        },
        description: 'Epoch time when the rate limit resets.',
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
          },
        },
      },
      ForbiddenError: {
        description: 'Forbidden',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
          },
        },
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
          },
        },
      },
      NotFoundError: {
        description: 'Not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
          },
        },
      },
      ConflictError: {
        description: 'Conflict',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
          },
        },
      },
      RateLimitError: {
        description: 'Rate limited',
        headers: {
          'X-RateLimit-Limit': {
            $ref: '#/components/headers/RateLimitLimit',
          },
          'X-RateLimit-Remaining': {
            $ref: '#/components/headers/RateLimitRemaining',
          },
          'X-RateLimit-Reset': {
            $ref: '#/components/headers/RateLimitReset',
          },
          'Retry-After': {
            schema: {
              type: 'integer',
            },
            description: 'Seconds to wait before retrying.',
          },
        },
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
          },
        },
      },
      InternalError: {
        description: 'Internal error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
          },
        },
      },
    },
    schemas: {
      ApiMeta: {
        type: 'object',
        required: ['request_id', 'timestamp'],
        properties: {
          request_id: {
            type: 'string',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      ApiError: {
        type: 'object',
        required: ['code', 'message'],
        properties: {
          code: {
            type: 'string',
            enum: [
              'unauthorized',
              'forbidden',
              'not_found',
              'validation_error',
              'conflict',
              'rate_limited',
              'internal_error',
            ],
          },
          message: {
            type: 'string',
          },
          details: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        required: ['error', 'meta'],
        properties: {
          error: {
            $ref: '#/components/schemas/ApiError',
          },
          meta: {
            $ref: '#/components/schemas/ApiMeta',
          },
        },
      },
      Pagination: {
        type: 'object',
        required: ['has_more', 'next_cursor'],
        properties: {
          has_more: {
            type: 'boolean',
          },
          next_cursor: {
            type: 'string',
            nullable: true,
          },
          total_count: {
            type: 'integer',
          },
        },
      },
      DreamBoardStatus: {
        type: 'string',
        enum: ['draft', 'active', 'funded', 'closed', 'paid_out', 'expired', 'cancelled'],
      },
      GiftType: {
        type: 'string',
        enum: ['takealot_product', 'philanthropy'],
      },
      PayoutMethod: {
        type: 'string',
        enum: ['takealot_gift_card', 'karri_card_topup', 'philanthropy_donation'],
      },
      DisplayMode: {
        type: 'string',
        enum: ['gift', 'charity'],
      },
      TakealotGift: {
        type: 'object',
        required: ['product_url', 'product_name', 'product_image', 'product_price'],
        properties: {
          product_url: {
            type: 'string',
            format: 'uri',
          },
          product_name: {
            type: 'string',
          },
          product_image: {
            type: 'string',
            format: 'uri',
          },
          product_price: {
            type: 'integer',
          },
        },
      },
      PhilanthropyGift: {
        type: 'object',
        required: ['cause_id', 'cause_name', 'impact_description', 'amount_cents'],
        properties: {
          cause_id: {
            type: 'string',
          },
          cause_name: {
            type: 'string',
          },
          impact_description: {
            type: 'string',
          },
          amount_cents: {
            type: 'integer',
          },
        },
      },
      OverflowGift: {
        type: 'object',
        required: ['cause_id', 'cause_name', 'impact_description'],
        properties: {
          cause_id: {
            type: 'string',
          },
          cause_name: {
            type: 'string',
          },
          impact_description: {
            type: 'string',
          },
        },
      },
      DreamBoard: {
        type: 'object',
        required: [
          'id',
          'slug',
          'child_name',
          'child_photo_url',
          'birthday_date',
          'gift_type',
          'gift_data',
          'payout_method',
          'goal_cents',
          'raised_cents',
          'overflow_cents',
          'deadline',
          'status',
          'display_mode',
          'contribution_count',
          'public_url',
          'created_at',
          'updated_at',
        ],
        properties: {
          id: {
            type: 'string',
            example: 'db_abc123',
          },
          slug: {
            type: 'string',
          },
          child_name: {
            type: 'string',
          },
          child_photo_url: {
            type: 'string',
            format: 'uri',
          },
          birthday_date: {
            type: 'string',
            format: 'date',
          },
          gift_type: {
            $ref: '#/components/schemas/GiftType',
          },
          gift_data: {
            oneOf: [
              {
                $ref: '#/components/schemas/TakealotGift',
              },
              {
                $ref: '#/components/schemas/PhilanthropyGift',
              },
            ],
          },
          payout_method: {
            $ref: '#/components/schemas/PayoutMethod',
          },
          overflow_gift_data: {
            $ref: '#/components/schemas/OverflowGift',
            nullable: true,
          },
          goal_cents: {
            type: 'integer',
          },
          raised_cents: {
            type: 'integer',
          },
          overflow_cents: {
            type: 'integer',
          },
          message: {
            type: 'string',
            nullable: true,
          },
          deadline: {
            type: 'string',
            format: 'date-time',
          },
          status: {
            $ref: '#/components/schemas/DreamBoardStatus',
          },
          display_mode: {
            $ref: '#/components/schemas/DisplayMode',
          },
          contribution_count: {
            type: 'integer',
          },
          public_url: {
            type: 'string',
            format: 'uri',
          },
          created_at: {
            type: 'string',
            format: 'date-time',
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      DreamBoardCreateRequest: {
        type: 'object',
        required: [
          'child_name',
          'child_photo_url',
          'birthday_date',
          'gift_type',
          'gift_data',
          'payout_method',
          'goal_cents',
          'payout_email',
          'deadline',
        ],
        properties: {
          child_name: {
            type: 'string',
            minLength: 2,
            maxLength: 50,
          },
          child_photo_url: {
            type: 'string',
            format: 'uri',
          },
          birthday_date: {
            type: 'string',
            format: 'date',
          },
          gift_type: {
            $ref: '#/components/schemas/GiftType',
          },
          gift_data: {
            oneOf: [
              {
                $ref: '#/components/schemas/TakealotGift',
              },
              {
                type: 'object',
                required: ['cause_id', 'cause_name', 'impact_description', 'amount_cents'],
                properties: {
                  cause_id: {
                    type: 'string',
                  },
                  cause_name: {
                    type: 'string',
                  },
                  impact_description: {
                    type: 'string',
                  },
                  amount_cents: {
                    type: 'integer',
                  },
                  cause_description: {
                    type: 'string',
                  },
                  cause_image: {
                    type: 'string',
                  },
                },
              },
            ],
          },
          payout_method: {
            $ref: '#/components/schemas/PayoutMethod',
          },
          overflow_gift_data: {
            $ref: '#/components/schemas/OverflowGift',
          },
          goal_cents: {
            type: 'integer',
            minimum: 2000,
          },
          payout_email: {
            type: 'string',
            format: 'email',
          },
          message: {
            type: 'string',
            maxLength: 280,
          },
          deadline: {
            type: 'string',
            format: 'date-time',
          },
          karri_card_number: {
            type: 'string',
          },
        },
        description:
          'Overflow gift data is required for takealot_product. karri_card_number is required for karri_card_topup.',
      },
      DreamBoardResponse: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: {
            $ref: '#/components/schemas/DreamBoard',
          },
          meta: {
            $ref: '#/components/schemas/ApiMeta',
          },
        },
      },
      DreamBoardListResponse: {
        type: 'object',
        required: ['data', 'pagination', 'meta'],
        properties: {
          data: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/DreamBoard',
            },
          },
          pagination: {
            $ref: '#/components/schemas/Pagination',
          },
          meta: {
            $ref: '#/components/schemas/ApiMeta',
          },
        },
      },
      ContributionStatus: {
        type: 'string',
        enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
      },
      Contribution: {
        type: 'object',
        required: [
          'id',
          'dream_board_id',
          'amount_cents',
          'fee_cents',
          'net_cents',
          'payment_status',
          'created_at',
        ],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          dream_board_id: {
            type: 'string',
          },
          contributor_name: {
            type: 'string',
            nullable: true,
          },
          message: {
            type: 'string',
            nullable: true,
          },
          amount_cents: {
            type: 'integer',
          },
          fee_cents: {
            type: 'integer',
          },
          net_cents: {
            type: 'integer',
          },
          payment_status: {
            $ref: '#/components/schemas/ContributionStatus',
          },
          created_at: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      ContributionResponse: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: {
            $ref: '#/components/schemas/Contribution',
          },
          meta: {
            $ref: '#/components/schemas/ApiMeta',
          },
        },
      },
      ContributionListResponse: {
        type: 'object',
        required: ['data', 'pagination', 'meta'],
        properties: {
          data: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Contribution',
            },
          },
          pagination: {
            $ref: '#/components/schemas/Pagination',
          },
          meta: {
            $ref: '#/components/schemas/ApiMeta',
          },
        },
      },
      PayoutType: {
        type: 'string',
        enum: ['takealot_gift_card', 'philanthropy_donation', 'karri_card_topup'],
      },
      PayoutStatus: {
        type: 'string',
        enum: ['pending', 'processing', 'completed', 'failed'],
      },
      PayoutRecipientData: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
          },
          donor_email: {
            type: 'string',
            format: 'email',
          },
          donor_name: {
            type: 'string',
          },
          child_name: {
            type: 'string',
          },
          payout_method: {
            $ref: '#/components/schemas/PayoutMethod',
          },
          gift_type: {
            $ref: '#/components/schemas/GiftType',
          },
          product_url: {
            type: 'string',
            format: 'uri',
          },
          cause_id: {
            type: 'string',
          },
          gift_data: {
            oneOf: [
              {
                $ref: '#/components/schemas/TakealotGift',
              },
              {
                $ref: '#/components/schemas/PhilanthropyGift',
              },
            ],
          },
          overflow_gift_data: {
            $ref: '#/components/schemas/OverflowGift',
          },
          card_number_last4: {
            type: 'string',
            nullable: true,
          },
          card_number_masked: {
            type: 'string',
            nullable: true,
          },
        },
      },
      Payout: {
        type: 'object',
        required: [
          'id',
          'dream_board_id',
          'type',
          'gross_cents',
          'fee_cents',
          'net_cents',
          'status',
          'created_at',
        ],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          dream_board_id: {
            type: 'string',
          },
          type: {
            $ref: '#/components/schemas/PayoutType',
          },
          gross_cents: {
            type: 'integer',
          },
          fee_cents: {
            type: 'integer',
          },
          net_cents: {
            type: 'integer',
          },
          recipient_data: {
            $ref: '#/components/schemas/PayoutRecipientData',
            nullable: true,
          },
          status: {
            $ref: '#/components/schemas/PayoutStatus',
          },
          external_ref: {
            type: 'string',
            nullable: true,
          },
          error_message: {
            type: 'string',
            nullable: true,
          },
          created_at: {
            type: 'string',
            format: 'date-time',
          },
          completed_at: {
            type: 'string',
            format: 'date-time',
            nullable: true,
          },
        },
      },
      PayoutResponse: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: {
            $ref: '#/components/schemas/Payout',
          },
          meta: {
            $ref: '#/components/schemas/ApiMeta',
          },
        },
      },
      PayoutListResponse: {
        type: 'object',
        required: ['data', 'pagination', 'meta'],
        properties: {
          data: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Payout',
            },
          },
          pagination: {
            $ref: '#/components/schemas/Pagination',
          },
          meta: {
            $ref: '#/components/schemas/ApiMeta',
          },
        },
      },
      PayoutConfirmRequest: {
        type: 'object',
        required: ['external_ref'],
        properties: {
          external_ref: {
            type: 'string',
          },
          completed_at: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      PayoutFailRequest: {
        type: 'object',
        required: ['error_message'],
        properties: {
          error_code: {
            type: 'string',
          },
          error_message: {
            type: 'string',
          },
        },
      },
      WebhookEvent: {
        type: 'string',
        enum: [
          'dreamboard.created',
          'dreamboard.updated',
          'contribution.received',
          'pot.funded',
          'pot.closed',
          'payout.ready',
          'payout.completed',
          'payout.failed',
        ],
      },
      WebhookEndpoint: {
        type: 'object',
        required: ['id', 'url', 'events', 'is_active', 'created_at'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          url: {
            type: 'string',
            format: 'uri',
          },
          events: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/WebhookEvent',
            },
          },
          is_active: {
            type: 'boolean',
          },
          created_at: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      WebhookCreateRequest: {
        type: 'object',
        required: ['url', 'events', 'secret'],
        properties: {
          url: {
            type: 'string',
            format: 'uri',
          },
          events: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/WebhookEvent',
            },
          },
          secret: {
            type: 'string',
            minLength: 8,
          },
        },
      },
      WebhookResponse: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: {
            $ref: '#/components/schemas/WebhookEndpoint',
          },
          meta: {
            $ref: '#/components/schemas/ApiMeta',
          },
        },
      },
      WebhookListResponse: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/WebhookEndpoint',
            },
          },
          meta: {
            $ref: '#/components/schemas/ApiMeta',
          },
        },
      },
      WebhookDeleteResponse: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: {
            type: 'object',
            required: ['id'],
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
              },
            },
          },
          meta: {
            $ref: '#/components/schemas/ApiMeta',
          },
        },
      },
    },
  },
} as const;

export type OpenApiSpec = typeof openApiSpec;
