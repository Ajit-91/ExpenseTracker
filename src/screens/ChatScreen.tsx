import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, IconButton, Text, Surface, Avatar, ActivityIndicator, Button } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { fetchChatHistory, sendChatMessage, clearChatHistory } from '../redux/chatSlice';

export default function ChatScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { messages, loading } = useSelector((state: RootState) => state.chat);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    dispatch(fetchChatHistory());
  }, []);

  // Auto scroll to end when messages load/change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    const textToSend = input.trim();
    setInput('');
    dispatch(sendChatMessage(textToSend));
  };

  const handleClearHistory = () => {
    dispatch(clearChatHistory());
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      style={styles.container}
    >
      {/* Utility top bar */}
      <View style={styles.utilityBar}>
        <Text style={styles.utilityText}>Ask me to: 'Add Rs. 250 for pizza' or 'Show summary'</Text>
        {messages.length > 0 && (
          <Button
            mode="text"
            onPress={handleClearHistory}
            textColor="#FF4A4A"
            labelStyle={styles.clearBtnLabel}
            compact
          >
            Clear
          </Button>
        )}
      </View>

      {/* Message List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <IconButton icon="robot-outline" iconColor="#A0A0C0" size={64} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>AI Expense Buddy</Text>
            <Text style={styles.emptySubtitle}>
              I can help you log transactions, analyze monthly spending, and answer questions. Try asking:
            </Text>
            <Surface style={styles.promptCard} elevation={1}>
              <Text style={styles.promptExample}>"Add Rs. 350 for Uber under Travel"</Text>
            </Surface>
            <Surface style={styles.promptCard} elevation={1}>
              <Text style={styles.promptExample}>"How much did I spend this month?"</Text>
            </Surface>
            <Surface style={styles.promptCard} elevation={1}>
              <Text style={styles.promptExample}>"Show my category breakdown"</Text>
            </Surface>
          </View>
        }
        renderItem={({ item }) => {
          const isUser = item.sender === 'user';
          return (
            <View style={[styles.messageRow, isUser ? styles.userRow : styles.botRow]}>
              {!isUser && (
                <Avatar.Icon size={32} icon="robot" style={styles.botAvatar} color="#FFF" />
              )}
              <Surface
                style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}
                elevation={1}
              >
                <Text style={[styles.messageText, isUser ? styles.userText : styles.botText]}>
                  {item.text}
                </Text>
              </Surface>
              {isUser && (
                <Avatar.Icon size={32} icon="account" style={styles.userAvatar} color="#FFF" />
              )}
            </View>
          );
        }}
      />

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="small" color="#6C63FF" />
          <Text style={styles.loadingText}>AI is thinking...</Text>
        </View>
      )}

      {/* Message Input Box */}
      <Surface style={styles.inputContainer} elevation={3}>
        <TextInput
          placeholder="Message AI Assistant..."
          value={input}
          onChangeText={setInput}
          style={styles.chatInput}
          mode="flat"
          underlineColor="transparent"
          activeUnderlineColor="transparent"
          placeholderTextColor="#A0A0C0"
          textColor="#FFF"
          disabled={loading}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <IconButton
          icon="send"
          iconColor={input.trim() && !loading ? '#6C63FF' : '#A0A0C0'}
          disabled={!input.trim() || loading}
          size={24}
          onPress={handleSend}
          style={styles.sendButton}
        />
      </Surface>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E2C',
  },
  utilityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#252538',
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D44',
  },
  utilityText: {
    color: '#A0A0C0',
    fontSize: 11,
    fontStyle: 'italic',
    flex: 1,
  },
  clearBtnLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  userRow: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  botRow: {
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
  },
  botAvatar: {
    backgroundColor: '#38EF7D',
    marginRight: 8,
  },
  userAvatar: {
    backgroundColor: '#6C63FF',
    marginLeft: 8,
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#6C63FF',
    borderBottomRightRadius: 2,
  },
  botBubble: {
    backgroundColor: '#252538',
    borderBottomLeftRadius: 2,
    borderColor: '#2D2D44',
    borderWidth: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: '#FFF',
  },
  botText: {
    color: '#FFF',
  },
  loadingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  loadingText: {
    color: '#A0A0C0',
    marginLeft: 8,
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#252538',
    borderTopWidth: 1,
    borderTopColor: '#2D2D44',
  },
  chatInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#1E1E2C',
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  sendButton: {
    margin: 0,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    backgroundColor: '#252538',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#A0A0C0',
    textAlign: 'center',
    fontSize: 14,
    paddingHorizontal: 24,
    marginBottom: 20,
    lineHeight: 20,
  },
  promptCard: {
    backgroundColor: '#252538',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    width: '90%',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2D2D44',
  },
  promptExample: {
    color: '#A0A0C0',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
