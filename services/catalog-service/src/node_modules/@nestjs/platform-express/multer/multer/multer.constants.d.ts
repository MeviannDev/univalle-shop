export declare const multerExceptions: {
    LIMIT_PART_COUNT: string;
    LIMIT_FILE_SIZE: string;
    LIMIT_FILE_COUNT: string;
    LIMIT_FIELD_KEY: string;
    LIMIT_FIELD_VALUE: string;
    LIMIT_FIELD_COUNT: string;
    LIMIT_UNEXPECTED_FILE: string;
    MISSING_FIELD_NAME: string;
    LIMIT_FIELD_NESTING: string;
    LIMIT_FIELD_ARRAY_INDEX: string;
    INVALID_FIELD_NAME: string;
};
/**
 * Default of the number of parts (text fields and files) a multipart request
 * may have, which multer leaves at `Infinity`, so that a single request could
 * carry any number of fields and files. `1000` is the number of parts
 * `@fastify/multipart` accepts, and the number of parameters `body-parser`
 * parses in the urlencoded bodies the ExpressAdapter parses.
 */
export declare const DEFAULT_PARTS_LIMIT = 1000;
export declare const busboyExceptions: {
    MULTIPART_BOUNDARY_NOT_FOUND: string;
    MULTIPART_MALFORMED_PART_HEADER: string;
    MULTIPART_UNEXPECTED_END_OF_FORM: string;
    MULTIPART_UNEXPECTED_END_OF_FILE: string;
};
