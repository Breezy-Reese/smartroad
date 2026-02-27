import axios from './axiosInstance';

export const fetchTrips = async () => {
	const res = await axios.get('/trips');
	return res.data;
};

export const createTrip = async (payload: any) => {
	const res = await axios.post('/trips', payload);
	return res.data;
};
