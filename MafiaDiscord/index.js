import { Client, GatewayIntentBits, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ],
});

const discordBotToken = process.env.BotToken;

// 플레이어와 해당 텍스트 리스트를 설정
const players = [
    { name: 'Player1', texts: ['Hello!', 'How are you?', 'Nice to meet you!'], role: 'Mafia' },
    { name: 'Player2', texts: ['Hey!', 'What\'s up?', 'See you soon!'], role: 'Civil' },
    { name: 'Player3', texts: ['Hi there!', 'Good day!', 'Take care!'], role: 'Civil' },
];

let interval;
let isRunning = false; // 반복 작업 여부 추적
let isVoiceAllowed = false;

// 랜덤한 플레이어와 텍스트를 채팅에 보내는 함수
const voteMafia = async (channel, personIndex) => {
    const electedPerson = players[personIndex];
    const message = `${electedPerson.name} is selected, The people's role is ${electedPerson.role}`;
    
    // TTS로 말하게 하기
    await channel.send({ content: message, tts: isVoiceAllowed });
    players.splice(personIndex, 1); // 선택된 플레이어 제거
};

// 랜덤 메시지 전송 함수
const sendRandomMessage = async (channel) => {
    const randomPlayer = players[Math.floor(Math.random() * players.length)];
    const randomText = randomPlayer.texts[Math.floor(Math.random() * randomPlayer.texts.length)];
    
    // TTS로 말하게 하기
    await channel.send({ content: `${randomPlayer.name}: ${randomText}`, tts: isVoiceAllowed });
};

// 반복 작업을 시작하는 함수
const startRandomMessages = async (channel) => {
    if (isRunning) return; // 이미 실행 중이면 다시 시작하지 않음
    isRunning = true;
    interval = setInterval(async () => {
        await sendRandomMessage(channel);
    }, 5000); // 5초 간격
};

// 반복 작업을 멈추는 함수
const stopRandomMessages = () => {
    if (interval) {
        clearInterval(interval);
        isRunning = false;
    }
};

// 봇이 준비되었을 때 실행되는 코드
client.once('ready', async () => {
    console.log('Bot is online!');
});

// 버튼을 포함한 메시지 전송
client.on('messageCreate', async (message) => {
    if (message.content === '!start') {
        const startButton = new ButtonBuilder()
            .setCustomId('start')
            .setLabel('Start Bot')
            .setStyle(ButtonStyle.Success);

        const stopButton = new ButtonBuilder()
            .setCustomId('stop')
            .setLabel('Stop Bot')
            .setStyle(ButtonStyle.Danger);
        const voiceAllowButton = new ButtonBuilder().setCustomId('voice').setLabel('voice Bot').setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder()
            .addComponents(startButton, stopButton,voiceAllowButton);

        await message.channel.send({
            content: 'Click a button to start or stop the bot:',
            components: [row],
        });
     
    }

    if (message.content === "!control" && isRunning) {
        const voteButton = new ButtonBuilder()
            .setCustomId('vote')
            .setLabel('Vote for Mafia')
            .setStyle(ButtonStyle.Primary);
            const startButton = new ButtonBuilder()
            .setCustomId('start')
            .setLabel('Start Bot')
            .setStyle(ButtonStyle.Success);

        const stopButton = new ButtonBuilder()
            .setCustomId('stop')
            .setLabel('Stop Bot')
            .setStyle(ButtonStyle.Danger);
        const voiceAllowButton = new ButtonBuilder().setCustomId('voice').setLabel('voice Bot').setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder()
            .addComponents(voteButton,startButton,stopButton,voiceAllowButton);
        
        await message.channel.send({
            content: 'Click to vote for the Mafia:',
            components: [row],
        });
        
    }
});

// 버튼 클릭 시 실행되는 코드
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'start') {
        if (isRunning) {
            await interaction.reply('The bot is already running!');
        } else {
            await interaction.reply('Bot is now running!');
            await startRandomMessages(interaction.channel);
        }
    } else if (interaction.customId === 'stop') {
        if (!isRunning) {
            await interaction.reply('The bot is not running!');
        } else {
            stopRandomMessages();
            await interaction.reply('Bot has been stopped.');
        }
    } else if (interaction.customId === 'vote') {
        const voteButtons = players.map((player, index) => 
            new ButtonBuilder()
                .setCustomId(`vote_${index}`) // 각 플레이어에 대한 고유한 ID 설정
                .setLabel(player.name)
                .setStyle(ButtonStyle.Secondary)
        );

        const row = new ActionRowBuilder().addComponents(voteButtons); // 버튼들을 하나의 행으로 그룹화

        await interaction.reply({
            content: 'Choose a player to vote for:',
            components: [row],
            ephemeral: true, // 이 옵션을 통해 특정 사용자에게만 보이는 메시지로 설정할 수 있습니다
        });
    } else if (interaction.customId.startsWith('vote_')) {
        const personIndex = parseInt(interaction.customId.split('_')[1]); // 인덱스 추출
        await voteMafia(interaction.channel, personIndex); // 투표 함수 호출
        await interaction.reply(`You voted for ${players[personIndex].name}!`); // 응답 메시지
    }
    else if (interaction.customId.startsWith('voice'))
        {
            isVoiceAllowed = !isVoiceAllowed;
        }
});

client.login(discordBotToken);
