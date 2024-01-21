import { jwtDecode, JwtPayload } from 'jwt-decode';

interface Token extends JwtPayload {
    username: string;
}

export const getUsernameFromToken = () => {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const decoded = jwtDecode<Token>(token);
            if (decoded.username) {
                return decoded.username;
            } else {
                // showMessage('Invalid session. Please log in again.');
                // logoutUser();
                // redirectToLogin();
                return '';
            }
        } catch (error) {
            console.error('Token decoding error:', error);
            // showMessage('Your session has expired. Please log in again');
            // logoutUser();
            // redirectToLogin();
        }
    }
    return '';
}
