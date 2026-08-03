import { FontAwesome5 } from '@react-native-vector-icons/fontawesome5';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { StyleSheet, Text, View } from 'react-native';
const GOLD = '#e1a566';
const features = [
  {
    title: 'Weather',
    family: 'mdi' as const,
    icon: 'weather-windy-variant',
  },
  {
    title: 'Medical',
    family: 'fa5' as const,
    icon: 'clinic-medical',
  },
  {
    title: 'Food',
    family: 'fa5' as const,
    icon: 'hamburger',
  },
  {
    title: 'Washroom',
    family: 'fa5' as const,
    icon: 'hands-wash',
  },
];

const LocalFeature = () => {
  return (
    <View style={styles.container}>
      {features.map((item) => (
        <View key={item.title} style={styles.card}>
          {item.family === 'mdi' ? (
            <MaterialDesignIcons
              name={item.icon as any}
              size={20}
              color={GOLD}
            />
          ) : (
            <FontAwesome5
              name={item.icon as any}
              iconStyle="solid"
              size={20}
              color={GOLD}
            />
          )}
          <Text style={styles.title}>{item.title}</Text>
        </View>
      ))}
    </View>
  );
};

export default LocalFeature;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },

  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',

    borderWidth: 1,
    borderColor: '#E5E7EB',

    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 3,
  },

  title: {
    marginTop: 8,
    fontSize: 8,
    fontWeight: '600',
    color: GOLD,
    textAlign: 'center',
  },
});
