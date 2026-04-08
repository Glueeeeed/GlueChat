export class InvalidDataFormatError extends Error {
    public statusCode: number;

    constructor(message: string) {
        super(message);
        this.statusCode = 400;
    }

}

export class InvalidCredentialsError extends Error {
    public statusCode: number;
    constructor(message: string) {
        super(message);
        this.statusCode = 401;
    }
}

export class AlreadyExistsError extends Error {
    public statusCode: number;

    constructor(message: string) {
        super(message);
        this.statusCode = 409;
    }
}

export class NotFoundError extends Error {
    public statusCode: number;
    constructor(message: string) {
        super();
        this.statusCode = 404;
    }
}


