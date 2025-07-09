import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { theme } from '../../theme/colors';

const { width } = Dimensions.get('window');

interface LineChartProps {
  data: Array<{ day: string; value: number }>;
  period?: string;
}

export const LineChart: React.FC<LineChartProps> = ({ data, period = '1M' }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Portfolio Performance</Text>
        <Text style={styles.period}>{period}</Text>
      </View>
      <View style={styles.chartContainer}>
        <View style={styles.yAxisLabels}>
          <Text style={styles.axisLabel}>${(maxValue / 1000).toFixed(0)}k</Text>
          <Text style={styles.axisLabel}>${(((maxValue + minValue) / 2) / 1000).toFixed(0)}k</Text>
          <Text style={styles.axisLabel}>${(minValue / 1000).toFixed(0)}k</Text>
        </View>
        <View style={styles.chartArea}>
          <View style={styles.gridLines}>
            <View style={[styles.gridLine, { top: 0 }]} />
            <View style={[styles.gridLine, { top: '50%' }]} />
            <View style={[styles.gridLine, { bottom: 0 }]} />
          </View>
          <View style={styles.lineContainer}>
            {data.map((point, index) => {
              const x = (index / (data.length - 1)) * 100;
              const y = range > 0 ? ((point.value - minValue) / range) * 100 : 50;
              return (
                <View
                  key={index}
                  style={[
                    styles.dataPoint,
                    {
                      left: `${x}%`,
                      bottom: `${y}%`,
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>
      </View>
      <View style={styles.xAxis}>
        <Text style={styles.axisLabel}>Start</Text>
        <Text style={styles.axisLabel}>Mid</Text>
        <Text style={styles.axisLabel}>End</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  period: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 150,
    marginVertical: theme.spacing.md,
  },
  yAxisLabels: {
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: theme.spacing.sm,
    width: 60,
  },
  chartArea: {
    flex: 1,
    position: 'relative',
  },
  gridLines: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  lineContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  dataPoint: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
    marginLeft: -2,
    marginBottom: -2,
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 60,
  },
  axisLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});