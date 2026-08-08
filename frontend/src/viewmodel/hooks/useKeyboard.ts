import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

export function useKeyboard() {
  const [height, setHeight] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvt, (e) => {
      setHeight(e.endCoordinates.height);
      setVisible(true);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => {
      setHeight(0);
      setVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return { visible, height };
}
