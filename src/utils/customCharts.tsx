import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Path, Circle, G } from 'react-native-svg';

interface PieSegment {
  value: number;
  color: string;
  label: string;
}

interface CustomPieChartProps {
  data: PieSegment[];
  totalSpent: number;
}

export const CustomPieChart: React.FC<CustomPieChartProps> = ({ data, totalSpent }) => {
  const size = 220;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return null;

  let currentAngle = 0;

  return (
    <View style={styles.pieContainer}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${center}, ${center}`}>
          {data.map((item, index) => {
            const percentage = item.value / total;
            const angle = percentage * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle = endAngle;

            // Handle the 100% case to avoid SVG arc command failure (start and end points are identical)
            if (percentage >= 0.999) {
              return (
                <Circle
                  key={index}
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  fill="none"
                />
              );
            }

            // Convert polar coordinates to cartesian for drawing segments
            const polarToCartesian = (angleInDegrees: number) => {
              const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
              return {
                x: center + radius * Math.cos(angleInRadians),
                y: center + radius * Math.sin(angleInRadians),
              };
            };

            const start = polarToCartesian(startAngle);
            const end = polarToCartesian(endAngle);
            const largeArcFlag = angle <= 180 ? '0' : '1';

            const pathData = [
              'M', start.x, start.y,
              'A', radius, radius, 0, largeArcFlag, 1, end.x, end.y
            ].join(' ');

            return (
              <Path
                key={index}
                d={pathData}
                stroke={item.color}
                strokeWidth={strokeWidth}
                fill="none"
              />
            );
          })}
        </G>
      </Svg>
      
      {/* Center Total Summary Label */}
      <View style={styles.centerLabel}>
        <Text style={styles.totalText}>Rs.{totalSpent.toLocaleString()}</Text>
        <Text style={styles.subText}>Total Spent</Text>
      </View>
    </View>
  );
};

interface BarItem {
  value: number;
  label: string;
  color: string;
}

interface CustomBarChartProps {
  data: BarItem[];
}

export const CustomBarChart: React.FC<CustomBarChartProps> = ({ data }) => {
  const maxValue = Math.max(...data.map(item => item.value), 1);
  const chartHeight = 130;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.barScroll}>
      <View style={styles.barChartContainer}>
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * chartHeight;

          return (
            <View key={index} style={styles.barColumn}>
              {/* Value Label above Bar */}
              <Text style={styles.barAmountText}>
                Rs.{item.value.toLocaleString()}
              </Text>
              
              {/* Rounded capsule bar track */}
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: Math.max(barHeight, 8), // Ensure it is always visible
                      backgroundColor: item.color,
                    },
                  ]}
                />
              </View>
              
              {/* Category Label at bottom */}
              <Text style={styles.barLabelText} numberOfLines={1}>
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  pieContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 12,
  },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
  },
  subText: {
    fontSize: 10,
    color: '#A0A0C0',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  barScroll: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  barChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  barColumn: {
    alignItems: 'center',
    marginHorizontal: 12,
    width: 64,
  },
  barAmountText: {
    fontSize: 9,
    color: '#FFF',
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  barTrack: {
    height: 130,
    width: 18,
    backgroundColor: '#2D2D44',
    borderRadius: 9,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: {
    width: '100%',
    borderRadius: 9,
  },
  barLabelText: {
    fontSize: 11,
    color: '#A0A0C0',
    textAlign: 'center',
    fontWeight: '600',
  },
});
