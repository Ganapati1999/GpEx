import { StyleSheet, Text, View } from 'react-native';
import React from 'react';

const ZeroState = ({ message }: { message: string }) => {
  return (
    <View style={styles.container}>
      <Text>{message}</Text>
    </View>
  );
};

export default ZeroState;

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});
