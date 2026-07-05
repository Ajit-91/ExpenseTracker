import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl } from 'react-native';
import { Text, Surface, Card, Title, Paragraph, Button, IconButton } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { fetchSummary, fetchBreakdown } from '../redux/expenseSlice';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

import { CustomPieChart, CustomBarChart } from '../utils/customCharts';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Main'>;
};

export default function DashboardScreen({ navigation }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  
  const { summary, breakdown, loading } = useSelector((state: RootState) => state.expenses);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchSummary(currentMonth)),
      dispatch(fetchBreakdown(currentMonth)),
    ]);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  const handlePrevMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    setCurrentMonth(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const nextDate = new Date(year, month, 1);
    setCurrentMonth(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const formatMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Clean palette for categories
  const colorPalette = ['#6C63FF', '#38EF7D', '#FF4E50', '#F9D423', '#00B4DB', '#F857A6'];

  const getCategoryColor = (index: number) => {
    return colorPalette[index % colorPalette.length];
  };

  // Prepare chart data for custom charts
  const chartData = Object.entries(breakdown).map(([key, value], index) => ({
    value: value,
    color: getCategoryColor(index),
    label: key,
  }));

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} colors={['#6C63FF']} />}
    >
      {/* Month Selector */}
      <View style={styles.monthSelector}>
        <IconButton icon="chevron-left" iconColor="#FFF" size={28} onPress={handlePrevMonth} />
        <Text style={styles.monthLabel}>{formatMonthName(currentMonth)}</Text>
        <IconButton icon="chevron-right" iconColor="#FFF" size={28} onPress={handleNextMonth} />
      </View>

      {/* Main KPI Summary Card */}
      <Card style={styles.kpiCard}>
        <Card.Content style={styles.kpiCardContent}>
          <Paragraph style={styles.kpiLabel}>TOTAL SPENT</Paragraph>
          <Title style={styles.kpiValue}>Rs. {summary.totalSpent.toLocaleString()}</Title>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiSubRow}>
            <View>
              <Paragraph style={styles.kpiSubLabel}>TOP CATEGORY</Paragraph>
              <Text style={styles.kpiSubValue}>{summary.topCategory}</Text>
            </View>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('AddEditExpense', {})}
              style={styles.addButton}
              icon="plus"
            >
              Add
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Chart Section */}
      {chartData.length > 0 ? (
        <Surface style={styles.sectionCard} elevation={2}>
          <Text style={styles.sectionTitle}>Spending Breakdown</Text>
          
          <CustomPieChart data={chartData} totalSpent={summary.totalSpent} />

          {/* Detailed breakdown list below chart */}
          <View style={styles.fallbackBreakdown}>
            {Object.entries(breakdown).map(([category, amount], index) => {
              const percentage = summary.totalSpent > 0 ? (amount / summary.totalSpent) * 100 : 0;
              return (
                <View key={category} style={styles.fallbackRow}>
                  <View style={styles.fallbackInfo}>
                    <View style={[styles.colorDot, { backgroundColor: getCategoryColor(index) }]} />
                    <Text style={styles.categoryName}>{category}</Text>
                    <Text style={styles.categoryAmount}>Rs. {amount.toLocaleString()}</Text>
                  </View>
                  <View style={styles.progressContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${percentage}%`,
                          backgroundColor: getCategoryColor(index),
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.percentageText}>{percentage.toFixed(0)}%</Text>
                </View>
              );
            })}
          </View>
        </Surface>
      ) : (
        <Surface style={styles.emptyCard} elevation={2}>
          <IconButton icon="cash-multiple" iconColor="#A0A0C0" size={48} />
          <Text style={styles.emptyText}>No expenses recorded for this month.</Text>
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('AddEditExpense', {})}
            style={styles.emptyButton}
            textColor="#6C63FF"
          >
            Create Your First Expense
          </Button>
        </Surface>
      )}

      {/* Monthly chart fallback or detail list */}
      {chartData.length > 0 && (
        <Surface style={styles.sectionCard} elevation={2}>
          <Text style={styles.sectionTitle}>Category Spending (Bar Chart)</Text>
          <CustomBarChart data={chartData} />
        </Surface>
      )}
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E2C',
    padding: 16,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  kpiCard: {
    borderRadius: 16,
    marginBottom: 20,
    backgroundColor: '#252538',
    overflow: 'hidden',
  },
  kpiCardContent: {
    padding: 20,
  },
  kpiLabel: {
    fontSize: 12,
    letterSpacing: 1.5,
    color: '#A0A0C0',
    fontWeight: 'bold',
  },
  kpiValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#38EF7D', // Neon green for positive cash feeling
    marginVertical: 4,
  },
  kpiDivider: {
    height: 1,
    backgroundColor: '#2D2D44',
    marginVertical: 12,
  },
  kpiSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiSubLabel: {
    fontSize: 10,
    letterSpacing: 1,
    color: '#A0A0C0',
  },
  kpiSubValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  addButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 8,
  },
  sectionCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#252538',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackBreakdown: {
    marginTop: 8,
  },
  fallbackRow: {
    marginBottom: 16,
  },
  fallbackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 14,
    color: '#FFF',
    flex: 1,
    fontWeight: 'bold',
  },
  categoryAmount: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: 'bold',
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#1E1E2C',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 10,
    color: '#A0A0C0',
    textAlign: 'right',
    marginTop: 2,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#252538',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#A0A0C0',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  emptyButton: {
    borderColor: '#6C63FF',
    borderWidth: 1,
  },
});
