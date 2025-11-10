import { Dimensions } from 'react-native';

export const height = Dimensions.get('window').height;
export const width = Dimensions.get('window').width;

export const IndCurrency = (n: number) => {
  if (n) {
    let num = n?.toString();
    let number = num ? num?.split('.') : num;
    return (
      number[0].replace(/(\d)(?=(\d\d)+\d$)/g, '$1,') +
      (number[1] ? '.' + number[1] : '')
    );
  } else {
    return 0;
  }
};
