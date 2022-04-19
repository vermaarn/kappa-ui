from sys import argv


def calc(num):
    """based on the input text, return the operation result"""
    return num + "hello from python"


if __name__ == "__main__":
    print(calc(argv[1]))