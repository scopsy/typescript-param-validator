# Typescript runtime param validation

A library for runtime param validations using typescript decorators
that works with `class-validator` library.
 
Useful when you need to validate parameter data coming from untyped source(i.e http body, and etc...) or when you need to perform complex validations on the input params.

Using the param validation decorator you can declare your validation on the type annotation and leave the validation work to `class-validator` 

## Install
```bash
npm install --save typescript-param-validator class-validators
```

## Examples
```typescript
import { Validator, Validate } from 'typescript-param-validator';
import { IsDate, IsNotEmpty, MaxDate, IsEmail, Length } from 'class-validators';

class DataDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;
  
  @Length(10, 200)
  @IsNotEmpty()
  description: string;
  
  @IsDate()
  @IsNotEmpty()
  @MaxDate(new Date())
  birthDate: Date;
}

class TestClass {
  @Validate()
  methodName(@Validator() data: DataDto) {
    
  }

  @Validate()
  serverControllerEndpoint(@Validator(DataDto, 'body') req: Request) {
    
  }
}

const instance = new TestClass();

// Will throw class-validator errors on runtime
instance.methodName({
  birthDate: new Date(),
  description: '123',
  email: 'fakemail'
});

instance.serverControllerEndpoint({
  body: {
    birthDate: new Date(),
    description: '123',
    email: 'fakemail'
  }
});
```

### Catching the Validation errors

In order to catch the validation errors you need to check if the errors is instanceof `ValidatorError`;

```typescript
import { ValidatorError } from 'typescript-param-validator';

try {
  // ... code
} catch (error) {
  if (error instanceof ValidatorError) {
    // here you have access to the validationErrors object that 
    // will contain array of `class-validator` error objects.
    console.log(error.validationErrors);
  }
}
```

