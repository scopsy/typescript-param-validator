import 'reflect-metadata';
import { plainToClass } from 'class-transformer';
import {
  Validator as ClassValidator,
  ValidationError,
  ValidatorOptions
} from 'class-validator';

export class ValidatorError extends Error {
  constructor(public validationErrors: ValidationError[]) {
    super('Validation Error');

    Object.setPrototypeOf(this, ValidatorError.prototype);
  }
}

export function Validator(validatorOptions?: ValidatorOptions) {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const indices = Reflect.getMetadata(
      `validate_${key}_parameters`,
      target,
      key
    );
    const types = Reflect.getMetadata('design:paramtypes', target, key);
    const targets =
      Reflect.getMetadata(`validate_${key}_targets`, target, key) || {};

    descriptor.value = function(...args: any[]) {
      const errors = [];

      if (Array.isArray(indices)) {
        for (let i = 0; i < args.length; i++) {
          if (indices.indexOf(i) !== -1) {
            let value = args[i];
            let validatorClass = types[i];

            // if targets provided replace the value and validator classes
            if (targets && targets[i]) {
              value = getNestedObjectProperty(value, targets[i].targetKey);
              validatorClass = targets[i].validatorClass;
              // no value found under the specified key
              if (!value) {
                const error = new ValidationError();
                error.constraints = {
                  isDefined: `property ${targets[i].targetKey} is missing`
                };

                throw new ValidatorError([error]);
              }

              if (Array.isArray(types[i].prototype)) {
                if (!Array.isArray(value)) {
                  const error = new ValidationError();
                  error.constraints = {
                    isArray: 'input param must be array'
                  };

                  throw new ValidatorError([error]);
                }

                for (const argument of value) {
                  const paramErrors = getValidationErrors(
                    validatorClass,
                    argument,
                    validatorOptions
                  );
                  if (paramErrors.length) errors.push(...paramErrors);
                }
              }
            }

            // if the validator class is array we want to validate each item in the array
            const paramErrors = getValidationErrors(
              validatorClass,
              value,
              validatorOptions
            );
            if (paramErrors.length) errors.push(...paramErrors);
          }
        }

        if (errors.length) {
          throw new ValidatorError(errors);
        }

        return originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

/**
 * @param targetKey - when provided the validation will be performed on the provided key
 * instead of argument itself. useful for when the validator data is located in a nested object.
 * @param validatorClass - the validator class to use instead of the inferred ts type
 * @returns {(target: any, key: string, index) => void}
 */
export function ValidateParam(targetKey?: any, validatorClass?: any) {
  return (target: any, key: string, index: number) => {
    const indices =
      Reflect.getMetadata(`validate_${key}_parameters`, target, key) || [];

    if (validatorClass !== undefined && targetKey !== undefined) {
      const targets =
        Reflect.getMetadata(`validate_${key}_targets`, target, key) || {};
      targets[index] = {
        validatorClass,
        targetKey
      };
      Reflect.defineMetadata(`validate_${key}_targets`, targets, target, key);
    }

    indices.push(index);

    Reflect.defineMetadata(`validate_${key}_parameters`, indices, target, key);
  };
}

export function getValidationErrors(
  validatorClass: any,
  val: any,
  validatorOptions?: ValidatorOptions
): ValidationError[] {
  const data = plainToClass(validatorClass, val);
  const validator = new ClassValidator();

  return validator.validateSync(data, validatorOptions);
}

export function getNestedObjectProperty(object: any, path: string) {
  let value = object;
  if (!path) return value;

  const list = path.split('.');

  for (let i = 0; i < list.length; i++) {
    value = value[list[i]];
    if (value === undefined) return undefined;
  }

  return value;
}
