// import { REST, Routes, SlashCommandBuilder } from 'discord.js';
// import dotenv from 'dotenv';

// dotenv.config();

// const token = process.env.BotToken;
// const clientId = process.env.ClientId;
// const guildId = process.env.GuildId;

// // 명령어 정의 및 toJSON으로 변환
// const commands = [
//     new SlashCommandBuilder()
//         .setName('control')  // 슬래시 없이 명령어 이름 정의
//         .setDescription('Call button of mafia'),
// ].map(command => command.toJSON());  // 명령어를 JSON으로 변환

// // 명령어 등록 함수
// const registerCommands = (token, clientId, guildId) => {
//     const rest = new REST({ version: '10' }).setToken(token);

//     // Guild-specific 명령어 등록
//     rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
//         .then(() => console.log('Successfully registered application commands.'))
//         .catch(console.error);  // 에러 처리 추가
// };
// registerCommands(token,clientId,guildId)
