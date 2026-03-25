import * as React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { SessionView } from '@/-session/SessionView';


export default React.memo(() => {
    const { id, initialMessage } = useLocalSearchParams<{ id: string; initialMessage?: string }>();
    return (<SessionView id={id} initialMessage={initialMessage} />);
});