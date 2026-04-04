import validator from 'validator';

export function validateNickname (nickname: string) : String | boolean {
    if (validator.isEmpty(nickname)) {
       return "Nickname is empty";
    }
    if (validator.isEmail(nickname)) {
      return "Nickname cannot be email";
    }

    if (!validator.isLength(nickname, {min: 4 , max: 20})) {
      return "Nickname must be between 4 and 20 characters";
    }

    return true;

}

export function validateEmail(email : string) {
    if (validator.isEmpty(email)) {
      return "Email is empty";
   }
    if (!validator.isEmail(email)) {
     return "Email address is invalid";
    }
    return true;
}

export function validatePassword (password : string) {
  if (validator.isEmpty(password)) {
    return "Password is empty";
  }
  if (!validator.isStrongPassword(password)) {
    return "Password is too weak. It must contain at least 8 characters, including one uppercase letter, one lowercase letter, one number, and one special character.";
  }
  return true;
}

export function validate(email : string, password : string, nickname : string | null)
{
  let isNicknameValid;
  if (nickname !== null) {
    isNicknameValid = validateNickname(nickname);
    if (isNicknameValid !== true ) {
      return isNicknameValid
    }
  }
  const isEmailValid = validateEmail(email);
  const isPasswordValid = validatePassword(password);
  if (isEmailValid !== true) {
    return isEmailValid
  }
  if (isPasswordValid !== true) {
    return isPasswordValid
  }
}
