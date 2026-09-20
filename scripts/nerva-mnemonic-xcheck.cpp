// Standalone verbatim copy of nerva-project/nerva electrum-words.cpp loops
// (src/mnemonics/electrum-words.cpp, master, verified 2026-09-05) — used to
// cross-validate the TypeScript port in src/lib/nerva/cryptonote.ts.
//
//   bytes_to_words  : w[0] = SWAP32LE(*(const uint32_t*)(src + i*4));  (LE read)
//                     w[1..3] = carry encoding base 1626; + crc32 checksum word
//   words_to_bytes  : w[0] = indices formula; SWAP32LE; append 4 bytes (LE write)
//
// Compile: g++ -O2 -o /tmp/mnemonic-xcheck scripts/nerva-mnemonic-xcheck.cpp
// Usage:   /tmp/mnemonic-xcheck <hex32>                     → prints the 25 words
//          /tmp/mnemonic-xcheck --decode <w1> ... <w25>     → prints hex32
// Wordlist: scripts/nerva-wordlist-official.txt (extracted from nerva english.h)
#include <cstdio>
#include <cstdlib>
#include <cstdint>
#include <cstring>
#include <string>
#include <vector>
#include <fstream>

static std::vector<std::string> WORD_LIST; // 1626 English words, same order as english.h

static void load_word_list(const char *path)
{
  std::ifstream f(path);
  if (!f) { fprintf(stderr, "cannot open wordlist %s\n", path); exit(1); }
  std::string w;
  while (f >> w) WORD_LIST.push_back(w);
  if (WORD_LIST.size() != 1626) { fprintf(stderr, "wordlist size %zu != 1626\n", WORD_LIST.size()); exit(1); }
}

// boost::crc_32_type equivalent (reflected CRC-32, IEEE)
static uint32_t crc32(const std::string &s)
{
  uint32_t crc = 0xFFFFFFFFu;
  for (unsigned char c : s) {
    crc ^= c;
    for (int k = 0; k < 8; k++)
      crc = (crc >> 1) ^ (0xEDB88320u & (-(int32_t)(crc & 1)));
  }
  return crc ^ 0xFFFFFFFFu;
}

static uint32_t create_checksum_index(const std::vector<std::string> &word_list)
{
  std::string trimmed_words;
  for (const auto &w : word_list) trimmed_words += w.substr(0, 3);
  return crc32(trimmed_words) % (uint32_t)word_list.size();
}

// verbatim bytes_to_words (SWAP32LE = identity on little-endian → LE read)
static std::vector<std::string> bytes_to_words(const unsigned char *data, size_t len)
{
  std::vector<std::string> words;
  if (len == 0 || len % 4 != 0) return words;
  uint32_t word_list_length = (uint32_t)WORD_LIST.size();

  for (size_t i = 0; i < len / 4; i++)
  {
    uint32_t w[4];
    memcpy(&w[0], data + i * 4, 4);   // native LE read == SWAP32LE on LE hardware
    w[1] = w[0] % word_list_length;
    w[2] = ((w[0] / word_list_length) + w[1]) % word_list_length;
    w[3] = (((w[0] / word_list_length) / word_list_length) + w[2]) % word_list_length;
    words.push_back(WORD_LIST[w[1]]);
    words.push_back(WORD_LIST[w[2]]);
    words.push_back(WORD_LIST[w[3]]);
  }
  words.push_back(words[create_checksum_index(words)]);
  return words;
}

// verbatim words_to_bytes core (SWAP32LE = identity on LE → LE write)
static bool words_to_bytes(const std::vector<std::string> &seed_words, unsigned char *dst, size_t len)
{
  std::vector<uint32_t> matched_indices;
  for (const auto &w : seed_words) {
    // full-match only (our TS test uses full words)
    int idx = -1;
    for (uint32_t i = 0; i < WORD_LIST.size(); i++)
      if (WORD_LIST[i] == w) { idx = (int)i; break; }
    if (idx < 0) { fprintf(stderr, "word '%s' not in list\n", w.c_str()); return false; }
    matched_indices.push_back((uint32_t)idx);
  }
  uint32_t word_list_length = (uint32_t)WORD_LIST.size();

  size_t nwords = matched_indices.size();
  if (nwords % 3) return false;
  for (size_t i = 0; i < nwords / 3; i++)
  {
    uint32_t w[4];
    w[1] = matched_indices[i * 3];
    w[2] = matched_indices[i * 3 + 1];
    w[3] = matched_indices[i * 3 + 2];
    w[0] = w[1] + word_list_length * (((word_list_length - w[1]) + w[2]) % word_list_length) +
      word_list_length * word_list_length * (((word_list_length - w[2]) + w[3]) % word_list_length);
    if (!(w[0] % word_list_length == w[1])) { fprintf(stderr, "mumble mumble\n"); return false; }
    uint32_t le = w[0]; // SWAP32LE = identity on LE
    memcpy(dst + i * 4, &le, 4);
  }
  return true;
}

static void hex_to_bytes(const char *hex, unsigned char *out, size_t len)
{
  for (size_t i = 0; i < len; i++) {
    unsigned v;
    sscanf(hex + i * 2, "%2x", &v);
    out[i] = (unsigned char)v;
  }
}

int main(int argc, char **argv)
{
  load_word_list("/home/z/my-project/scripts/nerva-wordlist-official.txt");

  if (argc > 1 && strcmp(argv[1], "--decode") == 0)
  {
    std::vector<std::string> words(argv + 2, argv + argc);
    if (words.size() != 24 && words.size() != 25) { fprintf(stderr, "need 24 or 25 words\n"); return 1; }
    unsigned char out[32];
    memset(out, 0, sizeof(out));
    if (!words_to_bytes(words, out, 32)) return 1;
    for (size_t i = 0; i < 32; i++) printf("%02x", out[i]);
    printf("\n");
    return 0;
  }

  if (argc < 2) { fprintf(stderr, "usage: %s <hex32> | --decode w1..w25\n", argv[0]); return 1; }
  unsigned char bytes[32];
  hex_to_bytes(argv[1], bytes, 32);
  auto words = bytes_to_words(bytes, 32);
  for (size_t i = 0; i < words.size(); i++)
    printf("%s%s", i ? " " : "", words[i].c_str());
  printf("\n");
  return 0;
}
